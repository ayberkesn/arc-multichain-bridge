// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./SimplePoolWithLP.sol";

/**
 * @title PoolFactory
 * @dev Factory contract to create pools for different token pairs
 * Similar to Uniswap V2 Factory
 */
contract PoolFactory {
    // Mapping: tokenA => tokenB => pool address
    mapping(address => mapping(address => address)) public pools;
    
    // All pools created
    address[] public allPools;
    
    event PoolCreated(address indexed tokenA, address indexed tokenB, address pool, uint256);
    
    /**
     * @dev Create a new pool for token pair
     * @param tokenA Address of first token
     * @param tokenB Address of second token
     * @return pool Address of created pool
     */
    function createPool(address tokenA, address tokenB) external returns (address pool) {
        require(tokenA != tokenB, "Identical tokens");
        require(tokenA != address(0) && tokenB != address(0), "Zero address");
        
        // Ensure consistent ordering
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        
        require(pools[token0][token1] == address(0), "Pool exists");
        
        // Deploy new pool
        pool = address(new SimplePoolWithLP(token0, token1));
        
        pools[token0][token1] = pool;
        pools[token1][token0] = pool; // Populate reverse mapping
        allPools.push(pool);
        
        emit PoolCreated(token0, token1, pool, allPools.length);
    }
    
    /**
     * @dev Get pool address for token pair
     */
    function getPool(address tokenA, address tokenB) external view returns (address pool) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        pool = pools[token0][token1];
    }
    
    /**
     * @dev Get total number of pools
     */
    function allPoolsLength() external view returns (uint256) {
        return allPools.length;
    }
}

