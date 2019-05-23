const fs = require('fs');
const { sleep } = require('./Common');
const natural = require('natural');
const TfIdf = natural.TfIdf;
const tfidf = new TfIdf();
const tokenizer = new natural.WordTokenizer();

let url = "https://api.stackexchange.com/2.2/questions?key=TsELULFShNfv3LtUcuTk4Q((&order=desc&sort=votes&min=10&site=stackoverflow&tagged=javascript&pagesize=100";
/**
 * collect javascript articles,
 * store json in javascript_questions.json
 * async function
 */
async function collectArticles() {
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

/**
 * extract tags from article
 * calculate tfidf and keep only tags with
 * measure>0 
 * 
 * store in tags.json
 * rely on javascript_questions.json
 */
function extractTags() {
    let json = fs.readFileSync("javascript_questions.json");
    let items = JSON.parse(json);
    let tagMap = {};
    let tokens = {};
    let totalTokenCount = 0;
    for (let item of items) {
        let title = item.title;
        tfidf.addDocument(title);
        let _tokens = item.tags;
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
            if (i == items.length - 1) {
                processedCount++;
                console.log("processing token: " + token + " " + processedCount + "/" + totalTokenCount);
                if (processedCount == totalTokenCount) {
                    //then keep going
                    let filteredTagMap = {};

                    for (let tag in tagMap) {
                        if (tagMap[tag] >= 1) {
                            filteredTagMap[tag] = tagMap[tag];
                        }
                    }
                    console.log(filteredTagMap);
                    fs.writeFileSync("tags.json", JSON.stringify(filteredTagMap));
                }
            }
        });
    }
}

module.exports = { collectArticles, extractTags };