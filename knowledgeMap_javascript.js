const csvtojson = require('csvtojson');
const fs = require('fs');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const mathjs = require('mathjs');
const { Parser } = require('json2csv');

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
                        //generalTags[natural.PorterStemmer.stem(tag.name).toLowerCase()] = i;
                        generalTags[natural.PorterStemmer.stem(tag.name).toLowerCase()] = tag.measure;
                    }
                    count++;
                    if (count >= 3) {
                        //limit to 3 tags for each document
                        break;
                    }
                }
            }
            let orderedGeneralTags = [];
            for (let i in generalTags) {
                orderedGeneralTags.push({
                    tag: i,
                    measure: generalTags[i]
                });
            }
            orderedGeneralTags.sort(function (o1, o2) {
                return o1.measure - o2.measure;
            });
            let moreCommonGeneralTags = {};
            for (let i = 0; i < 5 && i < orderedGeneralTags.length; i++) {
                moreCommonGeneralTags[orderedGeneralTags[i].tag] = orderedGeneralTags[i].measure;
            }
            //console.log(generalTags);
            results.push({
                cluster: cluster,
                tags: moreCommonGeneralTags
            });
            //console.log(json);
        }
        fs.writeFileSync("generalTags_javascript.json", JSON.stringify(results));
    });
}

function inferOntology(xOverYThreshold = 0.6, yOverXThreshold = 0.9, outputCSV = false) {
    let clusters = JSON.parse(fs.readFileSync("generalTags_javascript.json"));
    let allTags = [];
    for (let cluster of clusters) {
        let tags = cluster.tags;
        for (let tag in tags) {
            if (allTags.includes(tag) == false) {
                allTags.push(tag);
            }
        }
    }
    let data = [];
    let dataAsMap = {};
    for (let tag of allTags) {
        console.log(tag);
        let row = {};
        data.push(row);
        row[" "] = tag;
        dataAsMap[tag] = row;

        for (let tag of allTags) {
            row[tag] = 0;
        }

        let exists = [];
        let queryingTag = tag;
        for (let cluster of clusters) {
            let tags = cluster.tags;
            for (let tag in tags) {
                if (tag == queryingTag) {
                    exists.push(cluster);
                }
            }
        }
        let candidateMap = {};
        for (let cluster of exists) {
            for (let tag in cluster.tags) {
                if (!candidateMap[tag]) {
                    candidateMap[tag] = 1;
                } else {
                    candidateMap[tag] = candidateMap[tag] + 1;
                }
            }
        }
        for (let _tag in candidateMap) {
            let value = (candidateMap[_tag] / exists.length);
            row[_tag] = value;
            // if (value > 0.5 && tag != _tag) {
            //     console.log("\t" + _tag + ":" + (candidateMap[_tag] / exists.length));
            // }
        }
        if (outputCSV) {
            let fields = [" ", ...allTags];
            const opts = { fields };
            const parser = new Parser(opts);
            const csv = parser.parse(data);
            //console.log(csv);
            fs.writeFileSync("knowledgeMap_javascript.csv", csv);
        }
    }
    let parentChildMap = {};//child->parent tag
    for (let tag of allTags) {
        parentChildMap[tag] = "javascript";//the default root
    }
    for (let y of allTags) {
        for (let x of allTags) {
            if (x != y) {
                if (dataAsMap[y][x] >= xOverYThreshold) {
                    if (dataAsMap[x][y] < yOverXThreshold) {
                        //console.log(x+" subsumes "+y);
                        parentChildMap[y] = x;
                    } else {
                        delete parentChildMap[y];
                        //console.log(y+" = "+x+":"+parentChildMap[y]+":"+parentChildMap[x]);
                    }
                }
            }
        }
    }
    //console.log(dataAsMap);
    console.log(parentChildMap);
    return parentChildMap;
}

function outputTree(parentChildMap) {
    let tempMap = {};
    for (let i in parentChildMap) {
        let child = i;
        let parent = parentChildMap[child];
        if (!tempMap[parent]) {
            tempMap[parent] = {};
        }

        let childNode = {};
        tempMap[parent][child] = childNode;
        tempMap[child] = childNode;
    }
    const treeify = require('treeify');
    console.log(treeify.asTree(tempMap["javascript"]));
    //console.log(tempMap["javascript"]);
}
//collectTagForClusters();
let parentChildMap = inferOntology(0.5, 1, false);
outputTree(parentChildMap);