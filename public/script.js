document.addEventListener('DOMContentLoaded', () => {
    const compileBtn = document.getElementById('compile-btn');
    const codeInput = document.getElementById('code-input');
    const stepsOutput = document.getElementById('steps-output');
    const codeOutput = document.getElementById('code-output');
    const outputPanel = document.querySelector('.output-panel');

    const ptreeOutput = document.getElementById('ptree-output');
    const atreeOutput = document.getElementById('atree-output');
    const macOutput = document.getElementById('mac-output');
    const tokensOutput = document.getElementById('tokens-output');

    // Tab Switching Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            // Add active to current
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
        });
    });

    compileBtn.addEventListener('click', async () => {
        const rawCode = codeInput.value;
        
        // Reset Logic
        stepsOutput.innerHTML = '';
        codeOutput.textContent = '';
        tokensOutput.textContent = '';
        ptreeOutput.textContent = '';
        atreeOutput.textContent = '';
        macOutput.textContent = '';
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
                    await new Promise(r => setTimeout(r, 200)); // Adjusted delay to be faster
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

            // Show outputs
            codeOutput.textContent = data.correctedCode || rawCode;
            tokensOutput.textContent = data.tokens ? data.tokens.map(t => '[' + t.type + ': ' + t.value.replace(/\n/g, '\\n') + ']').join('  ') : "No token stream generated.";
            ptreeOutput.textContent = data.parseTree || "No parse tree generated.";
            atreeOutput.textContent = data.annotatedParseTree || "No semantic annotations generated.";
            macOutput.textContent = data.threeAC || "No 3AC generated.";
            
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
