const request = require('request-promise');
const fs = require('fs');
const natural = require('natural');
const TfIdf = natural.TfIdf;
const tfidf = new TfIdf();
const tokenizer = new natural.WordTokenizer();
const mathjs = require('mathjs');

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
        if(filteredTokens.length>=100){
            break;
        }
        if (!isNaN(tag.count) && tag.count >= mean) {
            filteredTokens.push(tag);
        }
    }
    console.log(filteredTokens.length);
    fs.writeFileSync("filteredTokens.json", JSON.stringify(filteredTokens));
}

function convert2CSV() {
    let questions = JSON.parse(fs.readFileSync("javascript_questions.json"));
    let tagsInfo = JSON.parse(fs.readFileSync("filteredTokens.json"));
    let tags = tagsInfo.map(x => x.tag);
    console.log(tags);
    let fields = ["index", ...tags];
    let index = 0;
    let outputBuffer = "";
    //cooccurrence map
    //tag=>[cooccur_tag:count]
    let cooccur={};
    //have to write out the file gradually to prevent heap overflow
    fs.writeFileSync("questions.csv", fields.join(",") + "\r\n");
    for (let question of questions) {
        let title = question.title;
        let tokens = tokenizer.tokenize(title);
        let stemmedTokens = tokens.map(x => natural.PorterStemmer.stem(x).toLowerCase());
        let stemmedTokensMap = {};
        for (let stemmedToken of stemmedTokens) {
            stemmedTokensMap[stemmedToken] = "1";
        }
        //console.log(tags.length);
        //console.log(stemmedTokensMap.constructor);
        let validTags=[];
        for (let tag of tags) {
            if (stemmedTokensMap[tag] == "1") {
                validTags.push(tag);
            } 
        }
        for(let validTag of validTags){
            let cooccurMap=cooccur[validTag];
            if(!cooccurMap){
                cooccurMap={};
                cooccur[validTag]=cooccurMap;
            }
            for(let validTag2 of validTags){
                if(!cooccurMap[validTag2]){
                    cooccurMap[validTag2]=1;
                }else{
                    cooccurMap[validTag2]=cooccurMap[validTag2]+1;
                }
            }
        }
    }
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
            if(cooccur[stemmedToken]){
                for(let cooccurTag in cooccur[stemmedToken]){
                    stemmedTokensMap[cooccurTag]=cooccur[stemmedToken][cooccurTag]/cooccur[stemmedToken][stemmedToken];
                }
            }
        }
        for (let tag of tags) {
            if (stemmedTokensMap[tag] == "1") {
                record.push(1);
            } else {
                if(!stemmedTokensMap[tag]){
                    record.push(0);
                }else{
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
        // let record={};
        // let title=question.title;
        // let tokens = tokenizer.tokenize(title);
        // let stemmedTokens=tokens.map(x=>natural.PorterStemmer.stem(x).toLowerCase());
        // let stemmedTokensMap={};
        // for(let stemmedToken of stemmedTokens){
        //     stemmedTokensMap[stemmedToken]="";
        // }
        // for(let tag of tags){
        //     if(stemmedTokensMap[tag]){
        //         record[tag]=1;
        //     }else{
        //         record[tag]=0;
        //     }
        // }
        // //record['title']=title;
        // record['title']="";
        // record['index']=index;
        // index++;
        // records.push(record);
        // delete tokens;
        // delete stemmedTokens;
        // delete stemmedTokensMap;
    }
    if (outputBuffer.length > 0) {
        fs.appendFileSync("questions.csv", outputBuffer);
        outputBuffer = "";
    }
    // console.log("converting");
    // const json2csvParser = new Parser({ fields: fields});
    // const csv = json2csvParser.parse(records);
    // fs.writeFileSync("questions.csv", csv);
    console.log(cooccur);
}
//main();
//collectTags();
//processTags();
//console.log(natural.PorterStemmer.stem("javascript"));
convert2CSV();

