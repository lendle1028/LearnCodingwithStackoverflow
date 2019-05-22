const fs=require('fs');
const natural = require('natural');
const mathjs = require('mathjs');
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
        if (filteredTokens.length >= 100) {
            break;
        }
        if (!isNaN(tag.count) && tag.count >= mean) {
            filteredTokens.push(tag);
        }
    }
    console.log(filteredTokens.length);
    fs.writeFileSync("filteredTokens.json", JSON.stringify(filteredTokens));
}