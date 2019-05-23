const fs=require('fs');
const natural = require('natural');
const mathjs = require('mathjs');
const request=require('request-promise');
const {sleep}=require('./Common');
const tokenizer = new natural.WordTokenizer();
/**
 * read tags from tags.json
 * stem tags, and aggregate them
 * keep at most 100 tags with ref count>=average
 * store in filteredTokens.json
 */
function stemAndFilterTags() {
    let tags = JSON.parse(fs.readFileSync("tags.json"));
    let filteredTagMap = {};
    let mapping = {};
    for (let tag in tags) {
        let stemmedTag = natural.PorterStemmer.stem(tag).toLowerCase();
        mapping[stemmedTag] = tag;
        //let stemmedTag = tag.toLowerCase();
        if (stemmedTag.length > 2 && stemmedTag.match(/[^$\d]/)) {
            //console.log(tag + ":" + stemmedTag);
            if (!filteredTagMap[stemmedTag]) {
                filteredTagMap[stemmedTag] = tags[tag];
            } else {
                filteredTagMap[stemmedTag] = filteredTagMap[stemmedTag] + tags[tag];
            }
        }
    }
    //console.log(filteredTagMap);
    let sortedTagArray = [];
    for (let tag in filteredTagMap) {
        sortedTagArray.push({
            tag: tag,
            count: filteredTagMap[tag],
            original: mapping[tag]
        });
    }
    sortedTagArray.sort(function (o1, o2) {
        return (o1.count - o2.count) * -1;
    });
    //console.log(sortedTagArray);
    //console.log(sortedTagArray.length);
    fs.writeFileSync("important_tokens.json", JSON.stringify(sortedTagArray));
    //filter less important tags
    let counts = [];
    for (let tag of sortedTagArray) {
        if (!isNaN(tag.count)) {
            counts.push(tag.count);
        }
    }
    let mean = mathjs.mean(counts);
    let filteredTokens = [];
    for (let tag of sortedTagArray) {
        /*if (filteredTokens.length >= 1000) {
            break;
        }*/
        if (!isNaN(tag.count) && tag.count >= mean) {
            filteredTokens.push(tag);
        }
    }
    console.log(filteredTokens.length);
    fs.writeFileSync("filteredTokens.json", JSON.stringify(filteredTokens));
}
/**
 * construct the cooccurrence map
 * read data from filteredTokens.json and compare with data from https://api.stackexchange.com/2.2/tags
 * output cooccur_javascript.json
 * async function
 */
async function constructCooccurMap() {
    let cooccur = {};
    let tagsInfo = JSON.parse(fs.readFileSync("filteredTokens.json"));
    let tags = tagsInfo.map(x => x.original);
    let url="https://api.stackexchange.com/2.2/tags?key=TsELULFShNfv3LtUcuTk4Q((&site=stackoverflow&pagesize=100&tags=javascript";
    for(let tag of tags){
        tag=tag.toLowerCase();
        if(tag!="javascript"){
            console.log("processing: "+tag);
            let _url=url+";"+tag;
            let ret = await request.get({
                uri: _url,
                headers: {
                    'Accept-Encoding': 'gzip'
                },
                gzip: true
            });
            let items=JSON.parse(ret).items;
            let innerMap={};
            tag=natural.PorterStemmer.stem(tag).toLowerCase();
            for(let item of items){
                if(item.name=="javascript"){
                    continue;
                }
                innerMap[natural.PorterStemmer.stem(item.name).toLowerCase()]=item.count;
            }
            cooccur[tag]=innerMap;
            await sleep(10000);
        }
    }
    fs.writeFileSync("cooccur_javascript.json", JSON.stringify(cooccur));
}
/**
 * construct an article=>tag existence csv file
 * read from javascript_questions.json, filteredTokens.json, and cooccur_javascript
 * output questions.csv
 */
function constructArticle2TagCSV() {
    let questions = JSON.parse(fs.readFileSync("javascript_questions.json"));
    let tagsInfo = JSON.parse(fs.readFileSync("filteredTokens.json"));
    let tags = tagsInfo.map(x => x.tag);

    let fields = ["index", ...tags];
    let index = 0;
    let outputBuffer = "";
    //cooccurrence map
    //tag=>[cooccur_tag:count]
    let cooccur = JSON.parse(fs.readFileSync("cooccur_javascript.json"));;
    //have to write out the file gradually to prevent heap overflow
    fs.writeFileSync("questions.csv", fields.join(",") + "\r\n");
    
    for (let question of questions) {
        console.log(question.title + ":" + index);
        let record = [index];
        let title = question.title;
        let tokens = tokenizer.tokenize(title);
        let stemmedTokens = tokens.map(x => natural.PorterStemmer.stem(x).toLowerCase());
        let stemmedTokensMap = {};
        for (let stemmedToken of stemmedTokens) {
            stemmedTokensMap[stemmedToken] = "1";
        }
        for (let stemmedToken of stemmedTokens) {
            if (cooccur[stemmedToken]) {
                for (let cooccurTag in cooccur[stemmedToken]) {
                    let ratio=cooccur[stemmedToken][cooccurTag] / cooccur[stemmedToken][stemmedToken];
                    if(ratio<1){
                        stemmedTokensMap[cooccurTag] = cooccur[stemmedToken][cooccurTag] / cooccur[stemmedToken][stemmedToken];
                    }
                }
            }
        }
        for (let tag of tags) {
            if (stemmedTokensMap[tag] == "1") {
                record.push(1);
            } else {
                if (!stemmedTokensMap[tag]) {
                    record.push(0);
                } else {
                    record.push(stemmedTokensMap[tag]);
                }
            }
        }

        if (outputBuffer.length > 0 || index % 1000 == 1) {
            outputBuffer += "\r\n";
        }
        outputBuffer += record.join(",");
        if (index % 1000 == 0) {
            fs.appendFileSync("questions.csv", outputBuffer);
            outputBuffer = "";
        }
        index++;
       
    }
    if (outputBuffer.length > 0) {
        fs.appendFileSync("questions.csv", outputBuffer);
        outputBuffer = "";
    }
}

module.exports={stemAndFilterTags, constructCooccurMap, constructArticle2TagCSV};