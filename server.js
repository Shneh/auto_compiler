const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/compile', (req, res) => {
    const code = req.body.code;
    const inputPath = path.join(__dirname, 'compiler', 'temp_input.c');
    
    // Ensure compiler directory exists
    if (!fs.existsSync(path.join(__dirname, 'compiler'))) {
        fs.mkdirSync(path.join(__dirname, 'compiler'));
    }

    // Append a newline to ensure lex rules matching '\\n' work on the last line
    fs.writeFileSync(inputPath, code + "\n");

    const execPath = path.join(__dirname, 'compiler', 'lexer');
    const command = `"${execPath}" < "${inputPath}"`;
    
    exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
        let steps = [];
        if (stderr.trim()) {
            steps = stderr.trim().split('\n').filter(line => line.length > 0);
        }

        // Even if error is not null, we still return stdout and stderr 
        // because lex might exit differently or we just want to output best effort.
        res.json({
            correctedCode: stdout || "",
            steps: steps
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Auto-correcting compiler server running on http://localhost:${PORT}`);
});
