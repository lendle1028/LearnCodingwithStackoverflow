const csvtojson = require('csvtojson');
const fs = require('fs');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const mathjs = require('mathjs');

function collectTagForClusters() {
    let json = fs.readFileSync("javascript_questions.json");
    let items = JSON.parse(json);
    let results = [];
    csvtojson().fromFile("javascript_question_cluster.csv").then((json) => {
        //add the title property back
        for (let i = 0; i < json.length; i++) {
            json[i]["title"] = items[json[i].index].title;
        }
        for (let cluster = 1; cluster <= 100; cluster++) {
            console.log("processing cluster: " + cluster);
            let tfidf = new natural.TfIdf();
            let array = [];
            for (let i = 0; i < json.length; i++) {
                //console.log(json[i].cluster);
                if (parseInt(json[i].cluster) == cluster) {
                    array.push(json[i]);
                }
            }
            console.log(array.length);

            let allTokens = {};
            let documents = {};
            for (let i of array) {
                let title = i.title;
                let tokens = tokenizer.tokenize(title);
                for (let token of tokens) {
                    allTokens[token] = 0;
                }
                tfidf.addDocument(title);
                documents[i.index] = {
                    index: i.index,
                    title: title,
                    tags: []
                };
            }
            for (let token in allTokens) {
                if (token.length > 2 && token.match(/[^$\d]/)) {
                    tfidf.tfidfs(token, function (i, measure) {
                        if (measure > 0) {
                            documents[array[i].index].tags.push({
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
                    if (tag.name.toLowerCase() != "javascript") {
                        array.push(tag.measure);
                    }
                }
                if (array.length == 0) {
                    //skip document with no usable tags
                    continue;
                }
                let mean = mathjs.mean(array);
                let sd = mathjs.std(array);
                let count = 0;
                for (let tag of documents[i].tags) {
                    if (tag.name.toLowerCase() == "javascript") {
                        continue;
                    }
                    if (tag.measure <= mean - sd) {
                        //generalTags[tag.name.toLowerCase()] = i;
                        generalTags[natural.PorterStemmer.stem(tag.name).toLowerCase()]=i;
                    }
                    count++;
                    if (count >= 2) {
                        //limit to 3 tags for each document
                        break;
                    }
                }
            }
            //console.log(generalTags);
            results.push({
                cluster: cluster,
                tags: generalTags
            });
            //console.log(json);
        }
        fs.writeFileSync("generalTags_javascript.json", JSON.stringify(results));
    });
}

function inferOntology(){
    let clusters=JSON.parse(fs.readFileSync("generalTags_javascript.json"));
    let exists=[];
    let queryingTag="function";
    for(let cluster of clusters){
        let tags=cluster.tags;
        for(let tag in tags){
            if(tag==queryingTag){
                exists.push(cluster);
            }
        }
    }
    let candidateMap={};
    for(let cluster of exists){
        for(let tag in cluster.tags){
            if(!candidateMap[tag]){
                candidateMap[tag]=1;
            }else{
                candidateMap[tag]=candidateMap[tag]+1;
            }
        }
    }
    for(let tag in candidateMap){
        console.log(tag+":"+(candidateMap[tag]/exists.length));
    }
    console.log(exists);
}

collectTagForClusters();
//inferOntology();