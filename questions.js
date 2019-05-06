const request = require('request-promise');
const fs=require('fs');
//let url="https://api.stackexchange.com/2.2/questions?order=desc&sort=votes&min=50&site=stackoverflow&fromdate=1514764800&todate=1546214400";
let url = "https://api.stackexchange.com/2.2/questions?order=desc&sort=votes&min=50&site=stackoverflow&tagged=javascript&pagesize=100";

async function main() {
    let results=[];
    for (let page = 1; page <= 500; page++) {
        let ret = await request.get({
            uri: url+"&page="+page,
            headers: {
                'Accept-Encoding': 'gzip'
            },
            gzip: true
        });

        let response = JSON.parse(ret);
        let items=response.items;
        console.log(items.length);
        for (let item of items) {
            results.push(item);
        }
        if(!response.has_more){
            break;
        }
    }
    console.log(results.length);
    fs.writeFileSync("javascript_questions.json", JSON.stringify(results));
}

function collectTags(){
    let json=fs.readFileSync("javascript_questions.json");
    let items=JSON.parse(json);
    let tagMap={};
    for(let item of items){
        let tags=item.tags;
        for(let tag of tags){
            if(!tagMap[tag]){
                tagMap[tag]=1;
            }else{
                tagMap[tag]=tagMap[tag]+1;
            }
        }
    }
    let filteredTagMap={};
    for(let tag in tagMap){
        if(tagMap[tag]>=50){
            filteredTagMap[tag]=tagMap[tag];
        }
    }
    console.log(filteredTagMap);
}
//main();
collectTags();