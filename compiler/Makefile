all: lexer

lexer: lex.yy.c
	gcc lex.yy.c -o lexer -ll

lex.yy.c: lexer.l
	flex lexer.l

clean:
	rm -f lex.yy.c lexer
