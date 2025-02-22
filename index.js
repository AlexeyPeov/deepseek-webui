const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');

// Load stored chat messages from localStorage on page load
window.onload = () => {
    const storedMessages = localStorage.getItem('chatMessages');
    if (storedMessages) {
        chatMessages.innerHTML = storedMessages;
        attachCopyButtons();
    }
    chatInput.addEventListener('input', autoResize);
};

sendBtn.addEventListener('click', onButtonAction);
clearBtn.addEventListener('click', onClearAction);

chatInput.addEventListener('keypress', function(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendBtn.click();
    }
});

async function onButtonAction() {
    const text = chatInput.value + '\n';
    const message = chatInput.value;
    if (message === '') return; // Do not send if message is empty

    chatInput.value = '';
    autoResize();
    const userMessageDiv = document.createElement('div');
    userMessageDiv.innerHTML = `<strong>You:</strong>`;    
    const userMessagePre = document.createElement('pre');     
    userMessagePre.className = 'user-message';    
    userMessagePre.textContent = text;
    userMessageDiv.appendChild(userMessagePre);
    chatMessages.appendChild(userMessageDiv);

    updateLocalStorage();

    const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let receivedText = '';
    let lastMessageElement = null;
    let thinking = true

    const thinkingMessage = document.createElement('div');
    thinkingMessage.innerHTML = `<div class="message-content loading">thinking...</div>`;
    chatMessages.appendChild(thinkingMessage);
    lastMessageElement = thinkingMessage;
    chatMessages.scrollTop = chatMessages.scrollHeight

    let deepseekResponse = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }

        const chunk = decoder.decode(value);

        let formattedChunk = chunk;
        if (chunk.length > 1) {
            formattedChunk = chunk.replace(/\n/, '');
        }

        deepseekResponse += formattedChunk;

        if(thinking && deepseekResponse.includes('</think>'))
        {
            thinking = false
            lastMessageElement = null

            if (thinkingMessage)
                thinkingMessage.remove();            
        }

        if (thinking && lastMessageElement) {
            lastMessageElement.querySelector('.message-content').textContent = `thinking.. tokens generated: ${deepseekResponse.length}`;
            continue
        }

        const parsedContent = marked.parse(deepseekResponse.replace(/<think>([\s\S]*?)<\/think>/g, ''));

        if (lastMessageElement) {
            lastMessageElement.querySelector('.message-content').innerHTML = parsedContent;
        } else {
            const newMessage = document.createElement('div');
            newMessage.innerHTML = `<strong>DeepSeek:</strong> <div class="message-content">${parsedContent}</div>`;
            chatMessages.appendChild(newMessage);
            lastMessageElement = newMessage;
        }

        chatMessages.scrollTop = chatMessages.scrollHeight;
        updateLocalStorage();
        attachCopyButtons();
    }
}

async function onClearAction() {
    chatMessages.innerHTML = '';
    localStorage.removeItem('chatMessages');

    const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: '/clear' })
    });

    if (response.ok) {
        console.log('Context cleared successfully.');
    } else {
        console.error('Failed to clear context.');
    }
}

function updateLocalStorage() {
    localStorage.setItem('chatMessages', chatMessages.innerHTML);
}

function attachCopyButtons() {
    const codeBlocks = chatMessages.querySelectorAll('pre code');
    codeBlocks.forEach((codeBlock) => {
        if (!codeBlock.parentNode.querySelector('.copy-button')) {
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-button';
            copyButton.textContent = 'Copy';
            copyButton.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(codeBlock.textContent);
                    copyButton.textContent = 'Copied'; // Change text to 'Copied'
                    copyButton.style.backgroundColor = '#4CAF50'; // Change button color
                    setTimeout(() => {
                        copyButton.textContent = 'Copy'; // Revert text back to 'Copy'
                        copyButton.style.backgroundColor = '#333'; // Revert button color
                    }, 500);
                    
                } catch (err) {
                    console.error('Failed to copy: ', err);
                }
            });
            codeBlock.parentNode.appendChild(copyButton);
        }
    });
}

function autoResize() {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, chatMessages.clientHeight / 2)}px`;
}
