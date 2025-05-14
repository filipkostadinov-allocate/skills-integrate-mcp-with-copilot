document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const issueSearchBtn = document.getElementById("search-issues-btn");
  const githubIssuesList = document.getElementById("github-issues-list");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // GitHub Issue Search functionality
  issueSearchBtn.addEventListener("click", async () => {
    const searchQuery = document.getElementById("issue-search-query").value.trim();
    const sortBy = document.getElementById("search-sort").value;
    
    if (!searchQuery) {
      githubIssuesList.innerHTML = "<p class='error'>Please enter a search query</p>";
      return;
    }

    githubIssuesList.innerHTML = "<p>Searching for issues...</p>";
    
    try {
      // Build the search query - we'll search in title, body and comments
      let q = searchQuery;
      
      // Call our backend endpoint that will use the MCP GitHub server
      const response = await fetch(`/github/search-issues?q=${encodeURIComponent(q)}&sort=${sortBy}`);
      const results = await response.json();
      
      if (results.items && results.items.length > 0) {
        githubIssuesList.innerHTML = `<p>Found ${results.total_count} issues. Showing ${results.items.length}:</p>`;
        
        const issuesContainer = document.createElement("div");
        issuesContainer.className = "issues-container";
        
        results.items.forEach(issue => {
          const issueCard = document.createElement("div");
          issueCard.className = "issue-card";
          
          // Format dates
          const createdDate = new Date(issue.created_at).toLocaleDateString();
          const updatedDate = new Date(issue.updated_at).toLocaleDateString();
          
          // Get reactions summary if available
          const reactions = issue.reactions || {};
          const totalReactions = (reactions.total_count || 0);
          
          issueCard.innerHTML = `
            <h4><a href="${issue.html_url}" target="_blank">${issue.title}</a></h4>
            <p class="issue-meta">
              #${issue.number} opened on ${createdDate} by 
              <a href="${issue.user.html_url}" target="_blank">@${issue.user.login}</a>
            </p>
            <p class="issue-stats">
              <span title="Comments"><span class="icon">💬</span> ${issue.comments}</span>
              <span title="Reactions"><span class="icon">👍</span> ${totalReactions}</span>
            </p>
            <p class="issue-body">${issue.body ? issue.body.substring(0, 200) + '...' : 'No description'}</p>
          `;
          
          issuesContainer.appendChild(issueCard);
        });
        
        githubIssuesList.appendChild(issuesContainer);
      } else {
        githubIssuesList.innerHTML = "<p>No issues found matching your search criteria.</p>";
      }
    } catch (error) {
      githubIssuesList.innerHTML = "<p class='error'>Error searching for issues. Please try again later.</p>";
      console.error("Error searching GitHub issues:", error);
    }
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
