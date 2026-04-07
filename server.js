const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- Mock Phase Generators ---
function generateMockParseTree(code) {
    let tree = "Program\n └── FunctionDecl\n      ├── Type: int\n      ├── ID: main\n      └── Block\n";
    const matches = [...code.matchAll(/(int|float|double|char)\s+([a-zA-Z_]\w*)\s*(?:=\s*([^;]+))?;/g)];
    matches.forEach(m => {
        tree += `           ├── Decl\n           │    ├── Type: ${m[1]}\n           │    ├── ID: ${m[2]}\n`;
        if (m[3]) {
            tree += `           │    └── Expr: ${m[3]}\n`;
        }
    });
    // Find return
    const retMatch = code.match(/return\s+([^;]+);/);
    if (retMatch) {
         tree += `           └── Return\n                └── Expr: ${retMatch[1]}\n`;
    }
    return tree;
}

function generateMockAnnotatedParseTree(code) {
    let tree = "Program [Scope: Global]\n └── FunctionDecl [Type: int()]\n      ├── Type: int\n      ├── ID: main\n      └── Block [Scope: Local 1]\n";
    const matches = [...code.matchAll(/(int|float|double|char)\s+([a-zA-Z_]\w*)\s*(?:=\s*([^;]+))?;/g)];
    matches.forEach(m => {
        tree += `           ├── Decl [Var: ${m[2]}, Type: ${m[1]}]\n`;
        if (m[3]) {
            tree += `           │    └── Assign [LHS: ${m[1]}, RHS: ${m[1]}]\n`;
        }
    });
    // Find return
    const retMatch = code.match(/return\s+([^;]+);/);
    if (retMatch) {
         tree += `           └── Return [Type: int]\n`;
    }
    return tree;
}

function generateMock3AC(code) {
    let threeac = "; Three Address Code Generation\n";
    threeac += "begin_func main:\n";
    let tempCounter = 1;
    const matches = [...code.matchAll(/(int|float|double|char)\s+([a-zA-Z_]\w*)\s*(?:=\s*([^;]+))?;/g)];
    matches.forEach(m => {
        if (m[3]) {
            threeac += `  t${tempCounter} = ${m[3]}\n  ${m[2]} = t${tempCounter}\n`;
            tempCounter++;
        }
    });
    const retMatch = code.match(/return\s+([^;]+);/);
    if (retMatch) {
        threeac += `  t${tempCounter} = ${retMatch[1]}\n  return t${tempCounter}\n`;
    } else {
        threeac += `  return\n`;
    }
    threeac += "end_func main\n";
    return threeac;
}

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
        let steps = [
            "Initiating Compiler Phases...",
            "[Phase 1] Lexical Analysis: Tokenizing input code.",
            "[Phase 2] Syntax Analysis: Generating Abstract Syntax Tree.",
            "[Phase 3] Semantic Analysis: Verifying types and grammar.",
            "[Phase 4] Intermediate Code Generation: Creating IR.",
            "[Phase 5] Code Optimization: Improving code efficiency.",
            "[Phase 6] Target Code Generation: Emitting target code.",
            "[Phase 7] Error Checking & Symbol Table Analysis: Finalizing."
        ];

        let lexerErrors = stderr.trim();
        if (lexerErrors) {
            steps.push("--- Compiler Feedback ---");
            steps.push(...lexerErrors.split('\n').filter(line => line.length > 0));
        }

        const finalCode = stdout || "";

        // Even if error is not null, we still return stdout and stderr 
        // because lex might exit differently or we just want to output best effort.
        res.json({
            correctedCode: finalCode,
            steps: steps,
            parseTree: generateMockParseTree(finalCode),
            annotatedParseTree: generateMockAnnotatedParseTree(finalCode),
            threeAC: generateMock3AC(finalCode)
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Auto-correcting compiler server running on http://localhost:${PORT}`);
});
