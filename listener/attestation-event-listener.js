const { ethers } = require("ethers");
const neo4j = require("neo4j-driver");
require('dotenv').config()

async function main() {
    let provider = new ethers.providers.AlchemyProvider("optimism-goerli", process.env.ALCHEMY_API_KEY_OPTIMISM);

    const abi = [
        // Events
        "event AttestationCreated(address indexed creator, address indexed about, bytes32 indexed key, bytes val)"
    ];

    // initialize attestation contract
    const attestationContract = new ethers.Contract("0x7787194cca11131c0159c0acff7e127cf0b676ed", abi, provider);

    // listen to events
    filter = attestationContract.filters.AttestationCreated();
    const result = await attestationContract.queryFilter(filter);

    // Create a neo4j driver instance
    const driver = neo4j.driver(
        //'bolt://localhost:7687', // Replace with the bolt URI of your Neo4j instance
        'neo4j+s://0f01d659.databases.neo4j.io:7687', // Cloud instance
        neo4j.auth.basic('neo4j', process.env.NEO4J_CLOUD_PASSWORD) // Replace with your Neo4j username and password
    );

    // Create a session
    const session = driver.session();

    // build a graph
    graph = {};
    for (let i = 0; i < result.length; i++) {
        creator = result[i]['args'][0]; //creator
        about = result[i]['args'][1]; //about
        key = result[i]['args'][2]; //key
        val = result[i]['args'][3]; //val

        // Define a Cypher query to create a new relationship type
        const query = `
            MERGE (a:Address {address: $from})
            MERGE (b:Address {address: $to})
            MERGE (a)-[:ATTESTS {key: $key, val: $val}]->(b)
        `;
        const params = {
            from: creator,
            to: about,
            key: key,
            val: val
        }

        // Execute the query
        try {
            const result = await session.run(query, params);
            //console.log("Successful: ", result);
        } catch(err) {
            console.log("Err: ", err);
        }

        // index into a graph variable
        // console.log(creator + "->" + about);
        if (creator in graph) {
            graph[creator][about] = true;
        } else {
            graph[creator] = {};
            graph[creator][about] = true;
        }
    }

    console.log("==============================================");
    console.log("Final graph: ", graph);

    // Close the session and driver
    session.close();
    driver.close();
}

main();