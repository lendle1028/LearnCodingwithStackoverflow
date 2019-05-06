var natural = require('natural');
var TfIdf = natural.TfIdf;
var tfidf = new TfIdf();

let documents=[
    'this document is about node.',
    'this document is about ruby.',
    'this document is about ruby and node.',
    'this document is about node. it has node examples'
];

let tokens={};
var tokenizer = new natural.WordTokenizer();
for(let document of documents){
    tfidf.addDocument(document);
    let _tokens=tokenizer.tokenize(document);
    for(let token of _tokens){
        tokens[token]="";
    }
}

for(let token in tokens){
    console.log("token "+token+":");
    tfidf.tfidfs(token, function(i, measure) {
        console.log('document #' + i + ' is ' + measure);
    });
}
