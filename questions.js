const request = require('request-promise');
const fs = require('fs');
const keyword_extractor = require("keyword-extractor");
const natural = require('natural');
const TfIdf = natural.TfIdf;
const tfidf = new TfIdf();
const tokenizer = new natural.WordTokenizer();
const { Parser } = require('json2csv');
//let url="https://api.stackexchange.com/2.2/questions?order=desc&sort=votes&min=50&site=stackoverflow&fromdate=1514764800&todate=1546214400";
let url = "https://api.stackexchange.com/2.2/questions?key=TsELULFShNfv3LtUcuTk4Q((&order=desc&sort=votes&min=10&site=stackoverflow&tagged=javascript&pagesize=100";

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
    /*return new Promise(function(r){
        setTimeout(r, ms);
    });*/
}

async function main() {
    let results = [];
    try {
        for (let page = 1; page <= 500; page++) {
            let ret = await request.get({
                uri: url + "&page=" + page,
                headers: {
                    'Accept-Encoding': 'gzip'
                },
                gzip: true
            });

            let response = JSON.parse(ret);
            let items = response.items;
            console.log(items.length);
            for (let item of items) {
                results.push(item);
            }
            if (!response.has_more) {
                break;
            }

            if (page % 2 == 0) {
                console.log("wait for a while");
                await sleep(30000);
            }
        }
    } catch (e) { console.log(e); }
    console.log(results.length);
    fs.writeFileSync("javascript_questions.json", JSON.stringify(results));
}

function collectTags() {
    let json = fs.readFileSync("javascript_questions.json");
    let items = JSON.parse(json);
    let tagMap = {};
    let tokens = {};
    let totalTokenCount = 0;
    for (let item of items) {
        let tags = item.tags;
        
        let title = item.title;
        tfidf.addDocument(title);
        let _tokens = tokenizer.tokenize(title);
        console.log(title);
        for (let token of _tokens) {
            if (!tokens[token]) {
                totalTokenCount++;
            }
            tokens[token] = "";
        }
    }

    let processedCount = 0;
    for (let token in tokens) {
        processedCount++;
        console.log("processing token: " + token + " " + processedCount + "/" + totalTokenCount);
        tfidf.tfidfs(token, function (i, measure) {
            if (measure > 0) {
                let tag = token;
                if (!tagMap[tag]) {
                    tagMap[tag] = 1;
                } else {
                    tagMap[tag] = tagMap[tag] + 1;
                }
            }
            //console.log('document #' + i + ' is ' + measure);
        });
    }

    let filteredTagMap = {};
    
    for (let tag in tagMap) {
        if (tagMap[tag] >= 50) {
            filteredTagMap[tag] = tagMap[tag];
        }
    }
    console.log(filteredTagMap);
    fs.writeFileSync("tags.json", JSON.stringify(filteredTagMap));
}

function processTags() {
    let tags = JSON.parse(fs.readFileSync("tags.json"));
    let filteredTagMap = {};
    let mapping={};
    for (let tag in tags) {
        let stemmedTag = natural.PorterStemmer.stem(tag).toLowerCase();
        mapping[stemmedTag]=tag;
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
    let sortedTagArray=[];
    for(let tag in filteredTagMap){
        sortedTagArray.push({
            tag: tag,
            count: filteredTagMap[tag],
            original: mapping[tag]
        });
    }
    sortedTagArray.sort(function(o1, o2){
        return (o1.count-o2.count)*-1;
    });
    //console.log(sortedTagArray);
    //console.log(sortedTagArray.length);
    fs.writeFileSync("important_tokens.json", JSON.stringify(sortedTagArray));
}

function convert2CSV(){
    let questions = JSON.parse(fs.readFileSync("javascript_questions.json"));
    let tagsInfo=JSON.parse(fs.readFileSync("important_tokens.json"));
    let tags=tagsInfo.map(x=>x.tag);
    let fields=["index", "title", ...tags];
    let records=[];
    let index=0;
    //fs.writeFileSync("questions.csv", fields.join(","));
    for(let question of questions){
        console.log(question.title);
        let record={};
        let title=question.title;
        let tokens = tokenizer.tokenize(title);
        let stemmedTokens=tokens.map(x=>natural.PorterStemmer.stem(x).toLowerCase());
        let stemmedTokensMap={};
        for(let stemmedToken of stemmedTokens){
            stemmedTokensMap[stemmedToken]="";
        }
        for(let tag of tags){
            if(stemmedTokensMap[tag]){
                record[tag]=1;
            }else{
                record[tag]=0;
            }
        }
        record['title']=title;
        record['index']=index;
        index++;
        records.push(record);
    }
    console.log("converting");
    const json2csvParser = new Parser({ fields: fields});
    const csv = json2csvParser.parse(records);
    fs.writeFileSync("questions.csv", csv);
}
//main();
//collectTags();
//processTags();
//console.log(natural.PorterStemmer.stem("javascript"));
convert2CSV();