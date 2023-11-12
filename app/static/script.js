// script.js
document.addEventListener('DOMContentLoaded', function() {
    const modelSelect = document.getElementById('model-select');
    const maxTokensInput = document.getElementById('max-tokens');
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendMessageButton = document.getElementById('send-message');
    const MARKDOWN_CONVERTER = new showdown.Converter();

    // Load models from the API
    fetchModels();

    // Event for sending messages
    sendMessageButton.addEventListener('click', function() {
        sendMessage(userInput.value); // Pass the input text when sending a message
    });
    
    addMessage("bot", "Hello! How can I help you?");

    // Initially disable the send button if the textarea is empty
    sendMessageButton.disabled = userInput.value.trim() === '';

    // Event to handle the state change of the send button
    userInput.addEventListener('input', function() {
        // Enable the button if there is text, disable it if there is no text
        sendMessageButton.disabled = userInput.value.trim() === '';
    });
    
    // Function to load models
    function fetchModels() {
        fetch('/api/v1/models')
            .then(response => response.json())
            .then(models => {
                if (models.length > 0) {
                    models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model;
                        option.textContent = model;
                        modelSelect.appendChild(option);
                    });
                    modelSelect.selectedIndex = 0; // Automatically select the first model
                } else {
                    // No models available
                    addMessage('bot', 'No models available');
                }
            });
    }

    // Function to send messages
    function sendMessage(prompt) {
        // Disable the send button during the API call
        sendMessageButton.disabled = true;
        addMessage('user', prompt); // Add the user's message to the chat

        let botMessageId = addMessage('bot', '...'); // Temporary bot message
        let dots = 1;

        // Create an interval to update the bot message
        let typingInterval = setInterval(() => {
            dots = dots % 3 + 1; // This will make dots 1, 2, or 3
            updateBotMessage(botMessageId, '.'.repeat(dots));
        }, 500);
        
        // API call with POST
        fetch('/api/v1/models/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelSelect.value,
                prompt: prompt,
                max_tokens: parseInt(maxTokensInput.value, 10)
            })
        })
        .then(response => response.json())
        .then(data => {
            // Refactoring to handle a response in the format {"response": "response text"}
            updateBotMessage(botMessageId, data.response); // Add the bot's response to the chat
            // Clear user input
            userInput.value = '';
            clearInterval(typingInterval);
        })
        .catch(error => {
            console.error('Error:', error);
            clearInterval(typingInterval);
            addMessage('bot', 'There was an error processing your request.');
        })
        .finally(() => {
            // Re-enable send button
            sendMessageButton.disabled = false;
        });
    }

    // Function to add messages to the chat
    function addMessage(type, text) {
        const messageId = 'message-'+Math.floor(Math.random() * 1000)+"-"+Date.now();
        const messageElement = document.createElement('article');
        const messageHeader = document.createElement('header');
        const messageBody = document.createElement('section');
        const author = document.createElement('strong'); // Element for the author
        const authorIcon = document.createElement('span'); // Icon for the author
        messageBody.id = messageId;

        messageElement.classList.add('message');
        messageHeader.classList.add('message-header');
        messageBody.classList.add('message-body');
        author.classList.add('message-author'); // Class for the author
        authorIcon.classList.add('message-header-icon', `message-header-icon-${type}`); // Class for the author icon
	
        author.textContent = type === 'bot' ? 'Chat-LLM2' : 'You';

        messageHeader.appendChild(authorIcon);
        messageHeader.appendChild(author);
        messageBody.innerHTML = text;

        messageElement.appendChild(messageHeader);
        messageElement.appendChild(messageBody);

        chatHistory.appendChild(messageElement);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        return messageId;
    }
    
    function updateBotMessage(messageId, newText) {
        const messageContainer = document.getElementById(messageId);
        if (messageContainer) {
            // Clear the existing content
            messageContainer.innerHTML = '';
        
            // Convert the new text to HTML elements
            const newMessageElements = convertMarkdownToHtml(newText);

            // Replace the message content with the new elements
            newMessageElements.forEach(element => {
                messageContainer.appendChild(element);
            });
        }
    }

    function convertMarkdownToHtml(markdown) {
        const blocks = splitMarkdownBlocks(markdown);
        return blocks.filter(b => b.content).map(block => {
            if (block.type === 'text') {
                // Create a div and use MARKDOWN_CONVERTER to convert the content
                const div = document.createElement('div');
                div.className = 'text-fragment';
                div.innerHTML = MARKDOWN_CONVERTER.makeHtml(block.content).trim();
                return div;
            } else if (block.type === 'code') {
                // Generate a code fragment as a DOM element
                return generateCodeFragment(block);
            }
        });
    }

    
    function splitMarkdownBlocks(markdown) {
        const blocks = [];
        const lines = markdown.split('\n');
        let currentBlock = { type: '', content: [], language: '' };
        let inCodeBlock = false;

        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('```')) {
                if (inCodeBlock) {
                    // End the current code block
                    currentBlock.content = currentBlock.content.join('\n');
                    blocks.push(currentBlock);
                    inCodeBlock = false;
                    currentBlock = { type: '', content: [], language: '' };
                } else {
                    // Start a new code block
                    // If we weren't in a code block, then it's the start of a new one
                    // End any existing text block first
                    if (currentBlock.content.length) {
                        currentBlock.content = currentBlock.content.join('\n');
                        blocks.push(currentBlock);
                    }
                    // Start a new code block
                    inCodeBlock = true;
                    currentBlock = { type: 'code', content: [], language: '' };
                    // Extract the language if specified
                    const languageMatch = trimmedLine.match(/^```(\S+)/);
                    currentBlock.language = languageMatch ? languageMatch[1] : '';
                }
            } else if (inCodeBlock || currentBlock.type === '') {
                // Add the line to the current block
                currentBlock.content.push(line);

                if (!inCodeBlock) {
                    // Start a new text block if we are not in a code block
                    currentBlock.type = 'text';
                }
            } else {
                // Add the line to an existing text block
                currentBlock.content.push(line);
            }
        });

        // Don't forget to add the last block if there is one
        if (currentBlock.content.length > 0) {
            currentBlock.content = currentBlock.content.join('\n');
            blocks.push(currentBlock);
        }

        return blocks;
    }

    function generateCodeFragment(block) {
        // Create the main elements of the code fragment
        const fragmentDiv = document.createElement('div');
        fragmentDiv.classList.add('code-fragment');

        const headerDiv = document.createElement('div');
        headerDiv.classList.add('code-fragment-header');

        const bodyDiv = document.createElement('div');
        bodyDiv.classList.add('code-fragment-body');

        // Add the language to the header if it's defined or auto-detected later
        const languageSpan = document.createElement('span');
        languageSpan.classList.add('code-fragment-header-language');
        headerDiv.appendChild(languageSpan);

        // Add the copy button to the header
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy code';
        copyButton.onclick = () => {
            navigator.clipboard.writeText(block.content);
        };
        headerDiv.appendChild(copyButton);

        // Add the content to the body of the code fragment
        const preElement = document.createElement('pre');
        const codeElement = document.createElement('code');
        codeElement.textContent = block.content;
        preElement.appendChild(codeElement);
        bodyDiv.appendChild(preElement);

        // Assemble the complete code fragment
        fragmentDiv.appendChild(headerDiv);
        fragmentDiv.appendChild(bodyDiv);

        // Apply syntax highlighting
        if (hljs) {
            if (block.language) {
                // If a language is provided, use that
                codeElement.className = `language-${block.language}`;
                hljs.highlightElement(codeElement);
                languageSpan.textContent = block.language; // Make sure the span has the language text
            } else {
                // Try to auto-detect the language
                const result = hljs.highlightAuto(codeElement.textContent);
                codeElement.className = `language-${result.language}`;
                hljs.highlightElement(codeElement);
                languageSpan.textContent = result.language; // Update the span with the auto-detected language
            }
        } else {
            // If no syntax highlighting is available, display the language if it was provided
            if (block.language) {
                languageSpan.textContent = block.language;
            }
        }
        
        return fragmentDiv;
    }

});

