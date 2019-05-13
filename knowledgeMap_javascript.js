const csvtojson = require('csvtojson');
const fs = require('fs');
const natural = require('natural');
const tfidf = new natural.TfIdf();
const tokenizer = new natural.WordTokenizer();

let json = fs.readFileSync("javascript_questions.json");
let items = JSON.parse(json);
csvtojson().fromFile("javascript_question_cluster.csv").then((json) => {
    let array = [];
    let cluster = 1;
    for (let i = 0; i < items.length; i++) {
        //console.log(json[i].cluster);
        if (parseInt(json[i].cluster) == cluster) {
            array.push(i);
        }
    }
    console.log(array.length);

    let allTokens = {};
    let documents = {};
    for (let i of array) {
        //console.log(items[i].title);
        let title = items[i].title;
        let tokens = tokenizer.tokenize(title);
        for (let token of tokens) {
            allTokens[token] = 0;
        }
        tfidf.addDocument(title);
        documents[i] = {
            index: i,
            title: title,
            tags: []
        };
        /*for(let key in json[i]){
            if(key!="index" && key!="cluster"){
                if(json[i][key]=="1"){
                    //console.log("\t"+key);
                }
            }
        }*/
        /*console.log(items[i].title);
        for(let tag of items[i].tags){
            console.log("\t"+tag);
        }*/
    }
    for (let token in allTokens) {
        tfidf.tfidfs(token, function (i, measure) {
            if (measure > 0) {
                documents[array[i]].tags.push({
                    name: token,
                    measure: measure
                });
            }
            /*let score=allTokens[token];
            if(measure>score){
                allTokens[token]=measure;
            }*/
        });
    }
    fs.writeFileSync("test.json", JSON.stringify(documents));
    //console.log(json);
});