# filepath: /workspaces/skills-integrate-mcp-with-copilot/src/github_mcp.py
"""
GitHub Model Context Protocol (MCP) Service Module

This module provides functions for interacting with the GitHub MCP server.
"""

import os
import json
import subprocess
import httpx
from fastapi import HTTPException

class GitHubMCPService:
    """GitHub MCP Service for accessing GitHub API through MCP server"""
    
    def __init__(self, use_local_server=False):
        """Initialize the GitHub MCP service
        
        Args:
            use_local_server (bool): Whether to use a locally running MCP server or the Docker container
        """
        self.use_local_server = use_local_server
        self.local_server_url = "http://localhost:8912/github"
    
    async def execute_mcp_request(self, action, parameters):
        """Execute an MCP request to the GitHub MCP server
        
        Args:
            action (str): The MCP action to perform
            parameters (dict): The parameters for the MCP action
            
        Returns:
            dict: The MCP response
        """
        mcp_request = {
            "version": "0.1",
            "action": action,
            "parameters": parameters
        }
        
        # Try using local server first if specified
        if self.use_local_server:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        self.local_server_url,
                        json=mcp_request,
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        return response.json()
                    else:
                        # If local server fails, fall back to Docker container
                        print(f"Local MCP server error: {response.status_code}, {response.text}")
            except httpx.RequestError as e:
                print(f"Local MCP server connection error: {str(e)}")
        
        # Use Docker container as fallback or primary method
        try:
            # Use subprocess to communicate with MCP docker container directly
            process = subprocess.Popen(
                ["docker", "run", "-i", "--rm", "-e", "GITHUB_PERSONAL_ACCESS_TOKEN", 
                 "ghcr.io/github/github-mcp-server:v0.1.1"],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # Send MCP request to stdin
            stdout, stderr = process.communicate(json.dumps(mcp_request).encode())
            
            if process.returncode != 0:
                raise HTTPException(
                    status_code=500,
                    detail=f"GitHub MCP server error: {stderr.decode()}"
                )
                
            return json.loads(stdout.decode())
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Error executing MCP request: {str(e)}"
            )
    
    async def search_issues(self, query, sort="created", order="desc", per_page=10, page=1):
        """Search for GitHub issues
        
        Args:
            query (str): The search query
            sort (str): Sort criteria (created, updated, comments, reactions)
            order (str): Sort order (asc, desc)
            per_page (int): Number of results per page
            page (int): Page number
            
        Returns:
            dict: The search results
        """
        return await self.execute_mcp_request(
            action="search_issues",
            parameters={
                "q": query,
                "sort": sort,
                "order": order,
                "per_page": per_page,
                "page": page
            }
        )