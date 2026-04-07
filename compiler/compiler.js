function autocorrect(code) {
    let msgs = [];
    
    // 1. Uninitialized Declarations
    code = code.replace(/\b(int)\s+([a-zA-Z_]\w*)\s*;/g, (match, type, name) => {
        msgs.push(`Uninitialized integer '${name}' found. Auto-initialized to 0.`);
        return `${type} ${name} = 0;`;
    });
    code = code.replace(/\b(float|double)\s+([a-zA-Z_]\w*)\s*;/g, (match, type, name) => {
        msgs.push(`Uninitialized float/double '${name}' found. Auto-initialized to 0.0.`);
        return `${type} ${name} = 0.0;`;
    });
    code = code.replace(/\b(char)\s+([a-zA-Z_]\w*)\s*;/g, (match, type, name) => {
        msgs.push(`Uninitialized char '${name}' found. Auto-initialized to '\\0'.`);
        return `${type} ${name} = '\\0';`;
    });

    // 2. Smart Semicolon Injection
    // Inject before keywords if missing, but NOT if the previous character is part of a preprocessor directive '>' or '#'
    code = code.replace(/([^;{}\s>])\s*\n*\s*(int|float|double|char|return)\b/g, (match, prevChar, keyword) => {
        msgs.push(`Missing semicolon before '${keyword}'. Added ';'.`);
        return `${prevChar};\n${keyword}`;
    });

    // 3. Incomplete Assignments & Missing Semicolons
    let lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Incomplete assignments: "int x = \n"
        if (/=\s*$/.test(line)) {
            if (/\b(float|double)\b/.test(line)) {
                line = line.replace(/=\s*$/, '= 0.0;');
            } else {
                line = line.replace(/=\s*$/, '= 0;');
            }
            msgs.push(`[Line ${i+1}] Incomplete assignment. Added '0;'.`);
        }

        // Return empty or missing semicolon at the end of the line
        if (/^\s*return\s*$/.test(line)) {
            line = line.replace(/return/, 'return 0;');
            msgs.push(`[Line ${i+1}] Incomplete return statement. Added '0;'.`);
        } else if (/^\s*return\s+[^;{}]+$/.test(line)) {
            line = line + ';';
            msgs.push(`[Line ${i+1}] Missing semicolon in return statement. Added ';'.`);
        } else if (/^\s*(int|float|double|char|[a-zA-Z_]\w*)\s+.*[^\s;{}]\s*$/.test(line) && !line.includes('{') && !line.includes('}')) {
             // Catch all end of line missing semi colons
             line = line + ';';
             msgs.push(`[Line ${i+1}] Missing semicolon at end of line. Added ';'.`);
        }
        
        lines[i] = line;
    }
    
    return { correctedCode: lines.join('\n'), msgs };
}

class Lexer {
    constructor(input) {
        this.input = input;
        this.pos = 0;
        this.line = 1;
        this.col = 1;
    }

    advance() {
        if (this.pos >= this.input.length) return null;
        let char = this.input[this.pos++];
        if (char === '\n') {
            this.line++;
            this.col = 1;
        } else {
            this.col++;
        }
        return char;
    }

    peek(offset = 0) {
        if (this.pos + offset >= this.input.length) return null;
        return this.input[this.pos + offset];
    }

    tokenize() {
        let tokens = [];
        let keywords = new Set(['int', 'float', 'double', 'char', 'return', 'void']);
        
        while (this.pos < this.input.length) {
            let char = this.peek();
            
            if (/\s/.test(char)) {
                this.advance();
                continue;
            }

            // Comments
            if (char === '/' && this.peek(1) === '/') {
                while (this.peek() && this.peek() !== '\n') this.advance();
                continue;
            }
            if (char === '#') {
                while (this.peek() && this.peek() !== '\n') this.advance();
                continue;
            }

            // Identifiers and Keywords
            if (/[a-zA-Z_]/.test(char)) {
                let startCol = this.col;
                let val = '';
                while (this.peek() && /[a-zA-Z0-9_]/.test(this.peek())) {
                    val += this.advance();
                }
                tokens.push({
                    type: keywords.has(val) ? 'KEYWORD' : 'ID',
                    value: val,
                    line: this.line,
                    col: startCol
                });
                continue;
            }

            // Numbers
            if (/[0-9]/.test(char)) {
                let startCol = this.col;
                let val = '';
                let hasDot = false;
                while (this.peek() && /[0-9\.]/.test(this.peek())) {
                    if (this.peek() === '.') {
                        if (hasDot) break;
                        hasDot = true;
                    }
                    val += this.advance();
                }
                tokens.push({
                    type: 'NUMBER',
                    value: val,
                    line: this.line,
                    col: startCol
                });
                continue;
            }
            
            // Characters / Strings
            if (char === "'" || char === '"') {
                let quote = this.advance();
                let startCol = this.col;
                let val = quote;
                while (this.peek() && this.peek() !== quote) {
                    val += this.advance();
                }
                if (this.peek() === quote) val += this.advance();
                tokens.push({
                    type: 'LITERAL',
                    value: val,
                    line: this.line,
                    col: startCol
                });
                continue;
            }

            // Operators and Punctuation
            if (/[+\-*/%=(){};,]/.test(char)) {
                let startCol = this.col;
                let val = this.advance();
                tokens.push({
                    type: 'PUNCT',
                    value: val,
                    line: this.line,
                    col: startCol
                });
                continue;
            }

            // Unknown
            throw new Error(`[Line ${this.line}] Lexical Error: Unrecognized character '${char}'`);
        }

        tokens.push({ type: 'EOF', value: 'EOF', line: this.line, col: this.col });
        return tokens;
    }
}

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    peek() {
        return this.tokens[this.pos];
    }

    advance() {
        if (this.pos < this.tokens.length) return this.tokens[this.pos++];
        return this.tokens[this.tokens.length - 1];
    }

    match(type, value = null) {
        let t = this.peek();
        if (t.type === type && (value === null || t.value === value)) {
            return this.advance();
        }
        return null;
    }

    expect(type, value = null) {
        let t = this.match(type, value);
        if (!t) {
            let p = this.peek();
            let exp = value ? `'${value}'` : type;
            throw new Error(`[Line ${p.line}] Syntax Error: Expected ${exp} but got '${p.value}'`);
        }
        return t;
    }

    parse() {
        let ast = { type: 'Program', body: [] };
        while (this.peek().type !== 'EOF') {
            ast.body.push(this.parseGlobalDecl());
        }
        return ast;
    }

    parseGlobalDecl() {
        let typeKw = this.match('KEYWORD', 'int') || this.match('KEYWORD', 'float') || 
                     this.match('KEYWORD', 'double') || this.match('KEYWORD', 'char') || this.match('KEYWORD', 'void');
        
        if (!typeKw) {
            throw new Error(`[Line ${this.peek().line}] Syntax Error: Expected type declaration but got '${this.peek().value}'`);
        }

        let id = this.expect('ID');

        let t = this.peek();
        if (t.type === 'PUNCT' && t.value === '(') {
            this.advance(); // consume '('
            while (this.peek().value !== ')' && this.peek().type !== 'EOF') this.advance(); // mock params
            this.expect('PUNCT', ')');
            
            let body = this.parseBlock();
            return {
                type: 'FunctionDecl',
                returnType: typeKw.value,
                id: id.value,
                body: body
            };
        } else {
            let init = null;
            if (this.match('PUNCT', '=')) {
                init = this.parseExpr();
            }
            this.expect('PUNCT', ';');
            return {
                type: 'VariableDecl',
                varType: typeKw.value,
                id: id.value,
                init: init
            };
        }
    }

    parseBlock() {
        this.expect('PUNCT', '{');
        let block = { type: 'Block', body: [] };
        while (this.peek().value !== '}' && this.peek().type !== 'EOF') {
            block.body.push(this.parseStmt());
        }
        this.expect('PUNCT', '}');
        return block;
    }

    parseStmt() {
        let p = this.peek();
        if (['int', 'float', 'double', 'char'].includes(p.value)) {
            let typeKw = this.advance();
            let id = this.expect('ID');
            let init = null;
            if (this.match('PUNCT', '=')) {
                init = this.parseExpr();
            }
            this.expect('PUNCT', ';');
            return {
                type: 'VariableDecl',
                varType: typeKw.value,
                id: id.value,
                init: init
            };
        } else if (p.value === 'return') {
            let rt = this.advance();
            let expr = null;
            if (this.peek().value !== ';') {
                expr = this.parseExpr();
            }
            this.expect('PUNCT', ';');
            return { type: 'Return', expr: expr };
        } else if (p.type === 'ID') {
            let id = this.advance();
            if (this.match('PUNCT', '=')) {
                let expr = this.parseExpr();
                this.expect('PUNCT', ';');
                return { type: 'Assign', id: id.value, expr: expr };
            } else {
                throw new Error(`[Line ${p.line}] Syntax Error: Expected assignment after '${id.value}'`);
            }
        }
        
        throw new Error(`[Line ${p.line}] Syntax Error: Unrecognized statement starting with '${p.value}'`);
    }

    parseExpr() {
        let left = this.parsePrimary();
        if (['+', '-', '*', '/'].includes(this.peek().value)) {
            let op = this.advance().value;
            let right = this.parseExpr();
            return { type: 'BinaryExpr', op, left, right };
        }
        return left;
    }

    parsePrimary() {
        let t = this.peek();
        if (t.type === 'NUMBER' || t.type === 'LITERAL') {
            this.advance();
            return { type: 'Literal', value: t.value };
        }
        if (t.type === 'ID') {
            this.advance();
            return { type: 'Identifier', name: t.value };
        }
        throw new Error(`[Line ${t.line}] Syntax Error: Expected expression, got '${t.value}'`);
    }
}

class SemanticAnalyzer {
    constructor(ast) {
        this.ast = ast;
        this.symbolTable = {};
    }

    analyze() {
        this.visit(this.ast, 'global');
        return this.ast;
    }

    visit(node, scope) {
        if (!node) return;
        node.scope = scope;
        
        switch (node.type) {
            case 'Program':
                node.body.forEach(n => this.visit(n, 'global'));
                break;
            case 'FunctionDecl':
                node.annotation = `Type: ${node.returnType}()`;
                this.visit(node.body, `${node.id}_local`);
                break;
            case 'Block':
                node.body.forEach(n => this.visit(n, scope));
                break;
            case 'VariableDecl':
                this.symbolTable[`${scope}_${node.id}`] = node.varType;
                node.annotation = `Var: ${node.id}, Type: ${node.varType}`;
                if (node.init) this.visit(node.init, scope);
                break;
            case 'Assign':
                let tp = this.symbolTable[`${scope}_${node.id}`] || this.symbolTable[`global_${node.id}`];
                if (!tp) throw new Error(`Semantic Error: Undeclared variable '${node.id}' in assignment`);
                node.annotation = `LHS: ${node.id} (${tp})`;
                this.visit(node.expr, scope);
                break;
            case 'Return':
                this.visit(node.expr, scope);
                break;
            case 'BinaryExpr':
                this.visit(node.left, scope);
                this.visit(node.right, scope);
                break;
            case 'Identifier':
                let t = this.symbolTable[`${scope}_${node.name}`] || this.symbolTable[`global_${node.name}`];
                if (!t) throw new Error(`Semantic Error: Undeclared variable '${node.name}' used in expression`);
                node.annotation = `Type: ${t}`;
                break;
            case 'Literal':
                node.annotation = `Constant`;
                break;
        }
    }
}

class TACGenerator {
    constructor(ast) {
        this.ast = ast;
        this.code = [];
        this.tempCount = 1;
    }

    newTemp() {
        return `t${this.tempCount++}`;
    }

    generate() {
        this.code.push("; Three Address Code Generation");
        this.visit(this.ast);
        return this.code.join("\n") + "\n";
    }

    visit(node) {
        if (!node) return null;
        switch (node.type) {
            case 'Program':
                node.body.forEach(n => this.visit(n));
                break;
            case 'FunctionDecl':
                this.code.push(`begin_func ${node.id}:`);
                this.visit(node.body);
                this.code.push(`end_func ${node.id}\n`);
                break;
            case 'Block':
                node.body.forEach(n => this.visit(n));
                break;
            case 'VariableDecl':
                if (node.init) {
                    let val = this.visit(node.init);
                    this.code.push(`  ${node.id} = ${val}`);
                }
                break;
            case 'Assign':
                let val = this.visit(node.expr);
                this.code.push(`  ${node.id} = ${val}`);
                break;
            case 'BinaryExpr':
                let l = this.visit(node.left);
                let r = this.visit(node.right);
                let t = this.newTemp();
                this.code.push(`  ${t} = ${l} ${node.op} ${r}`);
                return t;
            case 'Return':
                if (node.expr) {
                    let ret = this.visit(node.expr);
                    this.code.push(`  return ${ret}`);
                } else {
                    this.code.push(`  return`);
                }
                break;
            case 'Identifier':
                return node.name;
            case 'Literal':
                return node.value;
        }
        return null;
    }
}

// Format util wrappers
function formatParseTree(node, prefix = "", isLeft = true, root = true) {
    if (!node) return "";
    let result = root ? node.type + "\n" : prefix + (isLeft ? "├── " : "└── ") + node.type;
    if (!root) {
        if (node.id) result += `: ${node.id}`;
        if (node.name) result += `: ${node.name}`;
        if (node.value) result += `: ${node.value}`;
        if (node.op) result += `: '${node.op}'`;
        result += "\n";
    }
    let children = [];
    if (node.body) children = Array.isArray(node.body) ? node.body : [node.body];
    if (node.init) children.push(node.init);
    if (node.expr) children.push(node.expr);
    if (node.left) children.push(node.left);
    if (node.right) children.push(node.right);
    children = children.filter(c => c);
    const newPrefix = prefix + (root ? "" : isLeft ? "│   " : "    ");
    for (let i = 0; i < children.length; i++) {
        result += formatParseTree(children[i], newPrefix, i < children.length - 1, false);
    }
    return result;
}

function formatAnnotatedTree(node, prefix = "", isLeft = true, root = true) {
    if (!node) return "";
    let label = node.type;
    if (node.annotation) label += ` [${node.annotation}]`;
    else if (node.scope) label += ` [Scope: ${node.scope}]`;
    let result = root ? label + "\n" : prefix + (isLeft ? "├── " : "└── ") + label;
    if (!root) {
        if (node.id) result += ` (${node.id})`;
        if (node.name) result += ` (${node.name})`;
        if (node.value) result += ` = ${node.value}`;
        result += "\n";
    }
    let children = [];
    if (node.body) children = Array.isArray(node.body) ? node.body : [node.body];
    if (node.init) children.push(node.init);
    if (node.expr) children.push(node.expr);
    if (node.left) children.push(node.left);
    if (node.right) children.push(node.right);
    children = children.filter(c => c);
    const newPrefix = prefix + (root ? "" : isLeft ? "│   " : "    ");
    for (let i = 0; i < children.length; i++) {
        result += formatAnnotatedTree(children[i], newPrefix, i < children.length - 1, false);
    }
    return result;
}

function compile(inputCode) {
    let steps = ["[Phase 0] Pre-processing: Auto-correcting syntax and variable states."];
    
    // Auto-correct phase
    let { correctedCode, msgs } = autocorrect(inputCode);
    if (msgs.length > 0) {
        msgs.forEach(m => steps.push("  -> " + m));
    } else {
        steps.push("  -> No fixes required.");
    }

    try {
        steps.push("[Phase 1] Lexical Analysis: Tokenizing code.");
        let lexer = new Lexer(correctedCode);
        let tokens = lexer.tokenize();

        steps.push("[Phase 2] Syntax Analysis: Generating Abstract Syntax Tree.");
        let parser = new Parser(tokens);
        let ast = parser.parse();

        steps.push("[Phase 3] Semantic Analysis: Verifying types and grammar.");
        let analyzer = new SemanticAnalyzer(ast);
        let annotatedAst = analyzer.analyze();

        steps.push("[Phase 4] Intermediate Code Generation: Creating IR.");
        let tacGen = new TACGenerator(annotatedAst);
        let threeAC = tacGen.generate();

        steps.push("[Phase 5] Code Optimization: Basic peephole passes (mocked).");
        steps.push("[Phase 6] Target Code Generation: Emitting target architecture code (mocked).");
        steps.push("[Phase 7] Finalizing Output & Symbol Tables.");
        steps.push("--- Compiler Feedback ---");
        steps.push("✓ Compilation finished seamlessly with 0 errors.");

        return {
            correctedCode: correctedCode,
            steps: steps,
            parseTree: formatParseTree(ast),
            annotatedParseTree: formatAnnotatedTree(annotatedAst),
            threeAC: threeAC,
            tokens: tokens
        };

    } catch (err) {
        // Halt and return strictly the error
        steps.push("--- Compilation HALTED ---");
        steps.push("❌ " + err.message);

        return {
            correctedCode: correctedCode,
            steps: steps,
            parseTree: "Compilation Failed: Parse tree unrecoverable due to strict syntax/semantic error.",
            annotatedParseTree: "Compilation Failed",
            threeAC: "Compilation Failed",
            tokens: []
        };
    }
}

module.exports = { compile };
