const request = require('request-promise');
const fs=require('fs');
//let url="https://api.stackexchange.com/2.2/questions?order=desc&sort=votes&min=50&site=stackoverflow&fromdate=1514764800&todate=1546214400";
let url = "https://api.stackexchange.com/2.2/questions?order=desc&sort=votes&min=50&site=stackoverflow&tagged=javascript&pagesize=100";

async function main() {
    let items=[];
    for (let page = 1; page <= 500; page++) {
        let ret = await request.get({
            uri: url+"&page="+page,
            headers: {
                'Accept-Encoding': 'gzip'
            },
            gzip: true
        });

        let response = JSON.parse(ret);
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