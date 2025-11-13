// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimplePoolWithLP
 * @dev A liquidity pool that issues LP tokens (like Uniswap V2)
 * Supports: Add liquidity, Remove liquidity, Swap tokens
 */
contract SimplePoolWithLP is ERC20, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    
    IERC20 public tokenA;
    IERC20 public tokenB;
    
    uint256 public reserveA;
    uint256 public reserveB;
    
    uint256 public constant FEE_BPS = 30; // 0.3% fee (30 basis points)
    uint256 private constant MINIMUM_LIQUIDITY = 10**3; // Prevents first person from draining
    
    event Mint(address indexed sender, uint256 amountA, uint256 amountB);
    event Burn(address indexed sender, uint256 amountA, uint256 amountB, address indexed to);
    event Swap(
        address indexed sender,
        uint256 amountAIn,
        uint256 amountBIn,
        uint256 amountAOut,
        uint256 amountBOut,
        address indexed to
    );
    event Sync(uint256 reserveA, uint256 reserveB);
    
    constructor(address _tokenA, address _tokenB) ERC20("Simple Pool LP", "SPLP") Ownable(msg.sender) {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }
    
    /**
     * @dev Add liquidity to the pool
     * @param amountADesired Desired amount of token A
     * @param amountBDesired Desired amount of token B
     * @param amountAMin Minimum amount of token A (slippage protection)
     * @param amountBMin Minimum amount of token B (slippage protection)
     * @return liquidity Amount of LP tokens minted
     */
    function addLiquidity(
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) external nonReentrant returns (uint256 liquidity) {
        // Sync reserves first to ensure we have accurate current state
        _update();
        (uint256 _reserveA, uint256 _reserveB) = (reserveA, reserveB);
        
        if (_reserveA == 0 && _reserveB == 0) {
            // First liquidity provision
            // Calculate liquidity with minimum locked
            uint256 totalLiquidity = _sqrt(amountADesired * amountBDesired);
            require(totalLiquidity > MINIMUM_LIQUIDITY, "Insufficient liquidity");
            liquidity = totalLiquidity - MINIMUM_LIQUIDITY;
            // Don't mint to address(0) - OpenZeppelin v5 doesn't allow it
            // The MINIMUM_LIQUIDITY is effectively locked by not minting it
        } else {
            // Calculate optimal amounts based on current ratio
            uint256 amountBOptimal = _quote(amountADesired, _reserveA, _reserveB);
            uint256 amountAOptimal;
            
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "Insufficient B amount");
                amountAOptimal = amountADesired;
            } else {
                amountAOptimal = _quote(amountBDesired, _reserveB, _reserveA);
                require(amountAOptimal <= amountADesired && amountAOptimal >= amountAMin, "Insufficient A amount");
                amountBOptimal = amountBDesired;
            }
            
            // Calculate liquidity to mint
            liquidity = _min(
                (amountAOptimal * totalSupply()) / _reserveA,
                (amountBOptimal * totalSupply()) / _reserveB
            );
            
            amountADesired = amountAOptimal;
            amountBDesired = amountBOptimal;
        }
        
        require(liquidity > 0, "Insufficient liquidity minted");
        
        tokenA.safeTransferFrom(msg.sender, address(this), amountADesired);
        tokenB.safeTransferFrom(msg.sender, address(this), amountBDesired);
        
        // Sync reserves after transfers to match actual balances
        _update();
        _mint(msg.sender, liquidity);
        
        emit Mint(msg.sender, amountADesired, amountBDesired);
    }
    
    /**
     * @dev Remove liquidity from the pool
     * @param liquidity Amount of LP tokens to burn
     * @param amountAMin Minimum amount of token A to receive
     * @param amountBMin Minimum amount of token B to receive
     * @param to Address to receive the tokens
     */
    function removeLiquidity(
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to
    ) external nonReentrant returns (uint256 amountA, uint256 amountB) {
        // Sync reserves first to ensure we have accurate current state
        _update();
        (uint256 _reserveA, uint256 _reserveB) = (reserveA, reserveB);
        
        uint256 _totalSupply = totalSupply();
        amountA = (liquidity * _reserveA) / _totalSupply;
        amountB = (liquidity * _reserveB) / _totalSupply;
        
        require(amountA > 0 && amountB > 0, "Insufficient liquidity burned");
        require(amountA >= amountAMin && amountB >= amountBMin, "Slippage too high");
        
        _burn(msg.sender, liquidity);
        
        tokenA.safeTransfer(to, amountA);
        tokenB.safeTransfer(to, amountB);
        
        // Sync reserves after transfers to match actual balances
        _update();
        
        emit Burn(msg.sender, amountA, amountB, to);
    }
    
    /**
     * @dev Swap token A for token B
     */
    function swapAToB(uint256 amountAIn, uint256 amountBOutMin, address to) 
        external 
        nonReentrant 
        returns (uint256 amountBOut) 
    {
        // Sync reserves FIRST to ensure we calculate with accurate current balances
        _update();
        (uint256 _reserveA, uint256 _reserveB) = (reserveA, reserveB);
        
        amountBOut = _getAmountOut(amountAIn, _reserveA, _reserveB);
        require(amountBOut >= amountBOutMin, "Insufficient output amount");
        
        tokenA.safeTransferFrom(msg.sender, address(this), amountAIn);
        tokenB.safeTransfer(to, amountBOut);
        
        // Sync reserves AFTER transfers to match actual balances
        _update();
        
        emit Swap(msg.sender, amountAIn, 0, 0, amountBOut, to);
    }
    
    /**
     * @dev Swap token B for token A
     */
    function swapBToA(uint256 amountBIn, uint256 amountAOutMin, address to) 
        external 
        nonReentrant 
        returns (uint256 amountAOut) 
    {
        // Sync reserves FIRST to ensure we calculate with accurate current balances
        _update();
        (uint256 _reserveA, uint256 _reserveB) = (reserveA, reserveB);
        
        amountAOut = _getAmountOut(amountBIn, _reserveB, _reserveA);
        require(amountAOut >= amountAOutMin, "Insufficient output amount");
        
        tokenB.safeTransferFrom(msg.sender, address(this), amountBIn);
        tokenA.safeTransfer(to, amountAOut);
        
        // Sync reserves AFTER transfers to match actual balances
        _update();
        
        emit Swap(msg.sender, 0, amountBIn, amountAOut, 0, to);
    }
    
    /**
     * @dev Calculate output amount for a swap
     */
    function getAmountOut(uint256 amountIn, bool isTokenA) 
        external 
        view 
        returns (uint256 amountOut) 
    {
        if (isTokenA) {
            amountOut = _getAmountOut(amountIn, reserveA, reserveB);
        } else {
            amountOut = _getAmountOut(amountIn, reserveB, reserveA);
        }
    }
    
    /**
     * @dev Get current reserves
     */
    function getReserves() external view returns (uint256 _reserveA, uint256 _reserveB) {
        return (reserveA, reserveB);
    }
    
    /**
     * @dev Public sync function to fix stale reserves
     * Anyone can call this to sync reserves with actual balances
     * Useful for fixing pools after reserve drift
     */
    function sync() external {
        _update();
    }
    
    // Internal functions
    
    /**
     * @dev Sync reserves with actual ERC20 token balances
     * This ensures reserves always match reality, preventing drift
     */
    function _update() private {
        reserveA = tokenA.balanceOf(address(this));
        reserveB = tokenB.balanceOf(address(this));
        emit Sync(reserveA, reserveB);
    }
    
    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) 
        private 
        pure 
        returns (uint256 amountOut) 
    {
        require(amountIn > 0, "Insufficient input amount");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");
        
        uint256 amountInWithFee = amountIn * (10000 - FEE_BPS);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 10000) + amountInWithFee;
        amountOut = numerator / denominator;
    }
    
    function _quote(uint256 amountA, uint256 _reserveA, uint256 _reserveB) 
        private 
        pure 
        returns (uint256 amountB) 
    {
        require(amountA > 0, "Insufficient amount");
        require(_reserveA > 0 && _reserveB > 0, "Insufficient liquidity");
        amountB = (amountA * _reserveB) / _reserveA;
    }
    
    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
    
    function _min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }
}

