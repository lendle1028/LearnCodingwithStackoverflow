const { collectArticles, extractTags } = require('./Article');
const { stemAndFilterTags, constructCooccurMap, constructArticle2TagCSV } = require('./Tags');
const { collectTagForClusters, inferOntology, outputTree } = require('./KnowledgeMap');

async function preProcessing() {
    //await collectArticles();
    //extractTags();
    //stemAndFilterTags();
    await constructCooccurMap();
    // constructArticle2TagCSV();
};

async function postProcessing() {
    await collectTagForClusters();
    let parentChildMap = inferOntology(0.4, 1, false);
    outputTree(parentChildMap);
}

preProcessing();
//postProcessing();