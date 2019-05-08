const request = require('request-promise');
const fs = require('fs');
const keyword_extractor = require("keyword-extractor");
const natural = require('natural');
const TfIdf = natural.TfIdf;
const tfidf = new TfIdf();
const tokenizer = new natural.WordTokenizer();
//let url="https://api.stackexchange.com/2.2/questions?order=desc&sort=votes&min=50&site=stackoverflow&fromdate=1514764800&todate=1546214400";
let url = "https://api.stackexchange.com/2.2/questions?key=TsELULFShNfv3LtUcuTk4Q((&order=desc&sort=votes&min=10&site=stackoverflow&tagged=javascript&pagesize=100";

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

            if(page % 2==0){
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
    for (let item of items) {
        let tags = item.tags;
        /*for(let tag of tags){
            if(!tagMap[tag]){
                tagMap[tag]=1;
            }else{
                tagMap[tag]=tagMap[tag]+1;
            }
        }*/
        let title = item.title;
        tfidf.addDocument(title);
        let _tokens = tokenizer.tokenize(title);
        console.log(title);
        for (let token of _tokens) {
            tokens[token] = "";
        }
        /*tags = keyword_extractor.extract(title,{
            language:"english",
            remove_digits: true,
            return_changed_case:true,
            remove_duplicates: true
        
        });
        console.log(tags);
        for(let tag of tags){
            if(!tagMap[tag]){
                tagMap[tag]=1;
            }else{
                tagMap[tag]=tagMap[tag]+1;
            }
        }*/
    }

    for (let token in tokens) {
        console.log("processing token: " + token);
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
}
main();
//collectTags();