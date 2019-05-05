const request = require('request-promise');
const fs=require('fs');
//let url="https://api.stackexchange.com/2.2/questions?order=desc&sort=votes&min=50&site=stackoverflow&fromdate=1514764800&todate=1546214400";
let url = "https://api.stackexchange.com/2.2/tags?order=desc&sort=popular&min=100000&site=stackoverflow";

async function main() {
    let ret=await request.get({
        uri: url,
        headers: {
            'Accept-Encoding': 'gzip'
        },
        gzip: true
    });
    let tags=[];
    let items=JSON.parse(ret).items;
    for(let item of items){
        tags.push({
            name: item.name,
            count: item.count
        });
    }
    fs.writeFileSync("popularTags.json", JSON.stringify(tags));
}

function loadPopularTags(topK=50){
    let json=fs.readFileSync("popularTags.json");
    let tags=JSON.parse(json);
    let ret=[];
    for(let i=0; i<topK && i<tags.length; i++){
        ret.push(tags[i]);
    }
    return ret;
}
//main();
console.log(loadPopularTags());