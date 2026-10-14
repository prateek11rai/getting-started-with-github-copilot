document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  let messageTimer;

  // Build elements with textContent so user-supplied values are never parsed as HTML
  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function labeledLine(label, value) {
    const line = document.createElement("p");
    line.append(createElement("strong", null, `${label}:`), ` ${value}`);
    return line;
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function renderParticipants(activityName, participants) {
    const section = createElement("div", "participants-section");
    section.appendChild(
      createElement("h5", null, `Participants (${participants.length})`)
    );

    if (participants.length === 0) {
      section.appendChild(
        createElement("p", "no-participants", "No one has signed up yet. Be the first!")
      );
      return section;
    }

    const list = createElement("ul", "participants-list");
    participants.forEach((email) => {
      const item = createElement("li", "participant-item");
      item.appendChild(createElement("span", "participant-email", email));

      const deleteButton = createElement("button", "delete-participant", "🗑️");
      deleteButton.type = "button";
      deleteButton.title = `Unregister ${email}`;
      deleteButton.setAttribute("aria-label", `Unregister ${email} from ${activityName}`);
      deleteButton.addEventListener("click", () => unregisterParticipant(activityName, email));
      item.appendChild(deleteButton);

      list.appendChild(item);
    });
    section.appendChild(list);
    return section;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and old options, keeping the placeholder option
      activitiesList.innerHTML = "";
      activitySelect.length = 1;

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const spotsLeft = details.max_participants - details.participants.length;

        const activityCard = createElement("div", "activity-card");
        activityCard.append(
          createElement("h4", null, name),
          createElement("p", null, details.description),
          labeledLine("Schedule", details.schedule),
          labeledLine("Availability", `${spotsLeft} spots left`),
          renderParticipants(name, details.participants)
        );
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = createElement("option", null, name);
        option.value = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function unregisterParticipant(activityName, email) {
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        await fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        // Refresh the cards so the new participant shows without a page reload
        await fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
