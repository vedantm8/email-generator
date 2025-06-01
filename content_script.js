//  Constants for Gmail DOM elements (subject to change by Google) 
const GMAIL_COMPOSE_WINDOW_SELECTOR = '.aoP.aoC';
const GMAIL_TOOLBAR_SELECTOR = '.btC'; 
const GMAIL_SEND_BUTTON_CONTAINER_SELECTOR = '.dL';
// More specific to the actual Gmail message body input div
const GMAIL_MESSAGE_BODY_SELECTOR = '.Am.aiL.Al[contenteditable="true"][aria-label="Message Body"]';

// Function to add the AI Generate Icon Button 
function addAIIconButtonToGmailCompose() {
    const composeWindow = document.querySelector(GMAIL_COMPOSE_WINDOW_SELECTOR);

    if (composeWindow && !composeWindow.querySelector('#aiGenerateIconButton')) {
        const toolbar = composeWindow.querySelector(GMAIL_TOOLBAR_SELECTOR);

        if (toolbar) {
            // Create the button as a div with styling to blend with Gmail's icons
            const aiIconButton = document.createElement('div');
            aiIconButton.id = 'aiGenerateIconButton';
            aiIconButton.title = 'Generate Email with AI'; 

            // Inline CSS for the button
            aiIconButton.style.cssText = `
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                margin-left: 8px; /* Space from other buttons */
                border-radius: 50%;
                transition: background-color 0.2s ease;
                background-color: #f0f0f0; /* Light background for visibility */
                color: #5f6368; /* Google's default icon color */
                font-weight: bold;
                font-size: 14px;
                line-height: 1; /* For centered text */
            `;
            aiIconButton.innerHTML = 'AI';

            aiIconButton.onmouseover = () => aiIconButton.style.backgroundColor = '#e0e0e0';
            aiIconButton.onmouseout = () => aiIconButton.style.backgroundColor = '#f0f0f0';

            // Find a suitable place to insert the button
            const sendButtonContainer = toolbar.querySelector(GMAIL_SEND_BUTTON_CONTAINER_SELECTOR);
            if (sendButtonContainer) {
                toolbar.insertBefore(aiIconButton, sendButtonContainer);
            } else {
                toolbar.appendChild(aiIconButton);
                console.warn("Could not find specific send button container in Gmail toolbar, appending AI Generate button directly.");
            }

            // Add click listener to open the modal
            aiIconButton.addEventListener('click', createAndShowModal);
        } else {
            console.warn("Gmail compose toolbar not found for button injection.");
        }
    }
}

// --- Function to create and show the Modal ---
function createAndShowModal() {
    // Remove existing modal if any to prevent duplicates
    let existingModal = document.getElementById('aiEmailModalOverlay');
    if (existingModal) {
        existingModal.remove();
    }

    // --- Modal Overlay ---
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'aiEmailModalOverlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999; /* Ensure it's on top */
    `;

    // --- Modal Content Box ---
    const modalContent = document.createElement('div');
    modalContent.id = 'aiEmailModalContent';
    modalContent.style.cssText = `
        background-color: #fff;
        padding: 25px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        width: 450px; /* Wider for better input */
        max-width: 90%;
        position: relative;
        font-family: Arial, sans-serif;
    `;

    // --- Modal Header and Form Elements ---
    modalContent.innerHTML = `
        <h2 style="margin-top: 0; margin-bottom: 20px; font-size: 1.5em; color: #333; text-align: center;">Generate Email with AI</h2>
        <label for="modalApiKey" style="display: block; margin-bottom: 5px; color: #555; font-weight: bold;">Gemini API Key:</label>
        <input type="password" id="modalApiKey" placeholder="Paste your Gemini API Key here"
               style="width: calc(100% - 22px); padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.95em;">

        <label for="modalPrompt" style="display: block; margin-bottom: 5px; color: #555; font-weight: bold;">Email Prompt:</label>
        <textarea id="modalPrompt" placeholder="e.g., 'Write a formal email to client about project delay due to unforeseen circumstances.'"
                  style="width: calc(100% - 22px); height: 100px; padding: 10px; margin-bottom: 20px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.95em; resize: vertical;"></textarea>

        <button id="modalGenerateButton"
                style="width: 100%; padding: 12px; background-color: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; font-weight: bold; transition: background-color 0.2s ease;">
            Generate Email
        </button>
        <p id="modalStatusMessage" style="margin-top: 15px; text-align: center; font-size: 0.9em; color: #d32f2f;"></p>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // --- Event Listeners for Modal Elements ---
    const modalApiKeyInput = document.getElementById('modalApiKey');
    const modalPromptInput = document.getElementById('modalPrompt');
    const modalGenerateButton = document.getElementById('modalGenerateButton');
    const modalStatusMessage = document.getElementById('modalStatusMessage');

    // Optionally, load last used API key from session storage for convenience
    const lastApiKey = sessionStorage.getItem('lastApiKeyForModal');
    if (lastApiKey) {
        modalApiKeyInput.value = lastApiKey;
    }

    // Close modal on overlay click (but not on content click)
    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
            modalOverlay.remove();
        }
    });

    // Handle ESC key to close modal
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && document.getElementById('aiEmailModalOverlay')) {
            document.getElementById('aiEmailModalOverlay').remove();
        }
    });

    // --- Generate Button Click Handler (in modal) ---
    modalGenerateButton.addEventListener('click', async () => {
        const apiKey = modalApiKeyInput.value.trim();
        const prompt = modalPromptInput.value.trim();

        if (!apiKey) {
            modalStatusMessage.textContent = 'Please enter your Gemini API Key.';
            modalStatusMessage.style.color = '#d32f2f';
            return;
        }
        if (!prompt) {
            modalStatusMessage.textContent = 'Please enter a prompt.';
            modalStatusMessage.style.color = '#d32f2f';
            return;
        }

        modalGenerateButton.textContent = 'Generating...';
        modalGenerateButton.disabled = true;
        modalStatusMessage.textContent = 'Working on it...';
        modalStatusMessage.style.color = '#1a73e8'; 

        try {
            // Save API key to session storage for convenience during the current session
            sessionStorage.setItem('lastApiKeyForModal', apiKey);

            // Corrected Gemini API endpoint with gemini-1.5-flash
            const GEMINI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

            const response = await fetch(GEMINI_API_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: prompt }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 500
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                let errorMessage = `Gemini API error: ${response.status}`;
                if (errorData && errorData.error && errorData.error.message) {
                    errorMessage += ` - ${errorData.error.message}`;
                } else {
                    errorMessage += ` - ${JSON.stringify(errorData)}`;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            let generatedText = "No content generated.";
            if (data.candidates && data.candidates.length > 0 &&
                data.candidates[0].content && data.candidates[0].content.parts &&
                data.candidates[0].content.parts.length > 0 && data.candidates[0].content.parts[0].text) {
                generatedText = data.candidates[0].content.parts[0].text;
            } else {
                console.warn("Unexpected Gemini API response structure:", data);
                throw new Error("Received unexpected response from Gemini API.");
            }

            // Insert generated text into Gmail compose window
            insertEmailIntoGmailCompose(generatedText);

            modalStatusMessage.textContent = 'Email generated successfully!';
            modalStatusMessage.style.color = '#388e3c'; // Green for success
            // Automatically close modal after a short delay
            setTimeout(() => modalOverlay.remove(), 1000);

        } catch (error) {
            console.error("Error generating email with Gemini:", error);
            modalStatusMessage.textContent = `Error: ${error.message}`;
            modalStatusMessage.style.color = '#d32f2f';
        } finally {
            modalGenerateButton.textContent = 'Generate Email';
            modalGenerateButton.disabled = false;
        }
    });
}

// --- Function to insert the generated email into the Gmail compose body ---
function insertEmailIntoGmailCompose(emailContent) {
    const composeWindow = document.querySelector(GMAIL_COMPOSE_WINDOW_SELECTOR);
    if (composeWindow) {
        const emailBody = composeWindow.querySelector(GMAIL_MESSAGE_BODY_SELECTOR);
        if (emailBody) {
            console.log("Found email body element:", emailBody); // Debugging log
            console.log("Attempting to insert:", emailContent); // Debugging log

            // Use setTimeout to ensure the DOM is ready for the change
            setTimeout(() => {
                // Ensure it's a contenteditable div
                if (emailBody.isContentEditable) {
                    emailBody.innerText = emailContent; // Set the text
                    // Crucial: Dispatch an 'input' event to make Gmail detect the change
                    // This often helps Gmail's internal state recognize the programmatic update.
                    const event = new Event('input', { bubbles: true });
                    emailBody.dispatchEvent(event);
                    console.log("Email content inserted and input event dispatched successfully.");
                } else {
                    console.warn("Email body was not contenteditable, cannot insert text directly.");
                }

            }, 50); // Small delay, e.g., 50ms

        } else {
            console.error("Gmail message body element NOT found using selector:", GMAIL_MESSAGE_BODY_SELECTOR);
            alert("Generated email, but couldn't find the body element to insert it. Please copy from console.");
            console.log("Generated Email (copy this):", emailContent);
        }
    } else {
        console.error("Gmail compose window not found when trying to insert email.");
        alert("Generated email, but no active compose window found. Please copy from console.");
        console.log("Generated Email (copy this):", emailContent);
    }
}

// --- MutationObserver to detect dynamic Gmail compose window loading ---
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            // Check for the presence of the compose window after new nodes are added
            const composeWindows = document.querySelectorAll(GMAIL_COMPOSE_WINDOW_SELECTOR);
            composeWindows.forEach(window => {
                // Ensure the button isn't already there to prevent duplicates
                if (!window.querySelector('#aiGenerateIconButton')) {
                    addAIIconButtonToGmailCompose();
                }
            });
        }
    });
});

// Start observing the document body for subtree modifications
observer.observe(document.body, { childList: true, subtree: true });

// Also try to add the button on initial load in case the compose window is already open
addAIIconButtonToGmailCompose();