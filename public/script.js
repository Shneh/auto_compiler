document.addEventListener('DOMContentLoaded', () => {
    const compileBtn = document.getElementById('compile-btn');
    const codeInput = document.getElementById('code-input');
    const stepsOutput = document.getElementById('steps-output');
    const codeOutput = document.getElementById('code-output');
    const outputPanel = document.querySelector('.output-panel');

    compileBtn.addEventListener('click', async () => {
        const rawCode = codeInput.value;
        
        // Reset Logic
        stepsOutput.innerHTML = '';
        codeOutput.textContent = '';
        outputPanel.classList.remove('output-success');
        
        // Button Loading State
        compileBtn.classList.add('loading');
        
        try {
            // Fake delay for animation "feel"
            await new Promise(r => setTimeout(r, 600));

            const response = await fetch('/compile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code: rawCode })
            });

            if (!response.ok) {
                throw new Error('Compilation server error');
            }

            const data = await response.json();
            
            // Render Steps Sequentially
            if (data.steps && data.steps.length > 0) {
                for (let i = 0; i < data.steps.length; i++) {
                    await new Promise(r => setTimeout(r, 400)); // Delay between steps
                    const stepDiv = document.createElement('div');
                    stepDiv.className = 'step-item';
                    stepDiv.textContent = data.steps[i];
                    stepsOutput.appendChild(stepDiv);
                    // Scroll to bottom
                    stepsOutput.scrollTop = stepsOutput.scrollHeight;
                }
            } else {
                stepsOutput.innerHTML = '<div class="placeholder glow-text" style="color: var(--success)">✓ No errors found. Code is clean!</div>';
            }

            // Finally, show the corrected code
            await new Promise(r => setTimeout(r, 400));
            codeOutput.textContent = data.correctedCode || rawCode;
            outputPanel.classList.add('output-success');
            
        } catch (err) {
            stepsOutput.innerHTML = `<div class="step-item" style="border-left-color: var(--error); background: rgba(248, 81, 73, 0.1);">
                Error: ${err.message}. Ensure backend is running.
            </div>`;
        } finally {
            compileBtn.classList.remove('loading');
        }
    });

    // Auto-indent for textarea
    codeInput.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.substring(0, start) + "    " + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 4;
        }
    });
});
