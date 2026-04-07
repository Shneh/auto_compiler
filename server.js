const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const { compile } = require('./compiler/compiler');

app.post('/compile', (req, res) => {
    try {
        const code = req.body.code || "";
        
        // Execute the new genuine compiler
        const result = compile(code);

        res.json({
            correctedCode: result.correctedCode,
            steps: result.steps,
            parseTree: result.parseTree,
            annotatedParseTree: result.annotatedParseTree,
            threeAC: result.threeAC
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Auto-correcting compiler server running on http://localhost:${PORT}`);
});
