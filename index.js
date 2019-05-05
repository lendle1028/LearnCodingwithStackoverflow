const request = require('request-promise');
const fs=require('fs');
//let url="https://api.stackexchange.com/2.2/questions?order=desc&sort=votes&min=50&site=stackoverflow&fromdate=1514764800&todate=1546214400";
let url = "https://api.stackexchange.com/2.2/questions?order=desc&sort=votes&min=50&site=stackoverflow";

async function main() {
    let tagMaps = {};
    let synMap={};
    let synURL="https://api.stackexchange.com/2.2/tags/synonyms?order=desc&sort=applied&min=1&site=stackoverflow&pagesize=100";
    let count=0;
    for(let page=1; page<=900; page++){
        console.log("page="+page);
        let ret = await request.get({
            uri: synURL+"&page="+page,
            headers: {
                'Accept-Encoding': 'gzip'
            },
            gzip: true
        });
        ret=JSON.parse(ret);
        let items = ret.items;
        for(let item of items){
            count++;
            synMap[item.from_tag]=item.to_tag;
        }
        if(!ret.has_more){
            break;
        }
    }
    console.log("count="+count);
    fs.writeFileSync("syn.json", JSON.stringify(synMap));
    for (let page = 1; page <= 5; page++) {
        let ret = await request.get({
            uri: url+"&page="+page,
            headers: {
                'Accept-Encoding': 'gzip'
            },
            gzip: true
        });

        let items = JSON.parse(ret).items;
        console.log(items.length);
        for (let item of items) {
            let date = new Date();
            date.setTime(item.last_activity_date * 1000);
            console.log(item.last_activity_date + ":" + date);
            let tags = item.tags;
            for (let tag of tags) {
                if(synMap[tag]){
                    tag=synMap[tag];
                }
                if (!tagMaps[tag]) {
                    tagMaps[tag] = 0;
                }
                tagMaps[tag] = tagMaps[tag] + 1;
            }
        }
    }
    console.log(tagMaps);
}
main();