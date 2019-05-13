const csvtojson = require('csvtojson');
const fs = require('fs');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const mathjs = require('mathjs');

let json = fs.readFileSync("javascript_questions.json");
let items = JSON.parse(json);
let results=[];
csvtojson().fromFile("javascript_question_cluster.csv").then((json) => {
    for (let cluster = 1; cluster <= 300; cluster++) {
        console.log("processing cluster: "+cluster);
        let tfidf = new natural.TfIdf();
        let array = [];
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
            if (token.length > 2 && token.match(/[^$\d]/)) {
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
        }
        for (let i in documents) {
            documents[i].tags.sort(function (o1, o2) {
                return o1.measure - o2.measure;
            });
        }

        let generalTags = {};
        for (let i in documents) {
            let array = [];
            for (let tag of documents[i].tags) {
                array.push(tag.measure);
            }
            if(array.length==0){
                //skip document with no usable tags
                continue;
            }
            let mean = mathjs.mean(array);
            let sd = mathjs.std(array);
            let count=0;
            for (let tag of documents[i].tags) {
                if (tag.measure <= mean - 0.5*sd) {
                    generalTags[tag.name.toLowerCase()] = i;
                }
                count++;
                if(count>=4){
                    //limit to 5 tags for each document
                    break;
                }
            }
        }
        console.log(generalTags);
        results.push({
            cluster: cluster,
            tags: generalTags
        });
        //console.log(json);
    }
    fs.writeFileSync("generalTags_javascript.json", JSON.stringify(results));
});