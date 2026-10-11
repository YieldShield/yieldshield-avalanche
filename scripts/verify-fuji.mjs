import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {createPublicClient,http,parseAbi} from 'viem';import {avalancheFuji} from 'viem/chains';
const m=JSON.parse(readFileSync('config/deployment.json'));const c=createPublicClient({chain:avalancheFuji,transport:http(m.rpcUrl)});
if(m.chainId!==43113||await c.getChainId()!==43113)throw new Error('Fuji identity mismatch');
const poolAbi=JSON.parse(readFileSync('contracts/out/AlpinePool.sol/AlpinePool.json')).abi;
const tokenAbi=JSON.parse(readFileSync('contracts/out/DemoAssets.sol/AlpineDemoDollar.json')).abi;
const oracleAbi=parseAbi(['function price() view returns(uint256)']);
for(const key of ['backingToken','scenarioOracle','referenceOracle','scenarioPool','referencePool'])if(!m[key]||!(await c.getCode({address:m[key]})))throw new Error(`${key} is not deployed`);
if(await c.readContract({address:m.backingToken,abi:tokenAbi,functionName:'decimals'})!==6)throw new Error('Wrong decimals');
const pools=[];
for(const key of ['referencePool','scenarioPool']){
 const read=(functionName)=>c.readContract({address:m[key],abi:poolAbi,functionName});
 const [backing,oracle,totalBacking,reserved,maturity,claimable]=await Promise.all(['backing','oracle','totalBacking','reservedBacking','maturity','totalClaimableBacking'].map(read));
 if(backing.toLowerCase()!==m.backingToken.toLowerCase()||oracle.toLowerCase()!==m[key.replace('Pool','Oracle')].toLowerCase())throw new Error('Immutable integration mismatch');
 const [balance,price]=await Promise.all([c.readContract({address:backing,abi:tokenAbi,functionName:'balanceOf',args:[m[key]]}),c.readContract({address:oracle,abi:oracleAbi,functionName:'price'})]);
 if(balance<totalBacking+claimable||totalBacking*10000n<reserved*15000n)throw new Error('Backing solvency failure');
 pools.push({key,address:m[key],backing,oracle,totalBacking:String(totalBacking),reserved:String(reserved),maturity:String(maturity),price:String(price)});
}
for(const tx of m.transactions){const receipt=await c.getTransactionReceipt({hash:tx.hash});if(receipt.status!=='success')throw new Error(`Unconfirmed ${tx.label}`);}
const evidence={verifiedAt:new Date().toISOString(),chainId:43113,blockNumber:String(await c.getBlockNumber()),pools,transactionCount:m.transactions.length,note:'Internal deployment verification, not an independent audit or adoption evidence.'};
mkdirSync('docs/evidence',{recursive:true});writeFileSync('docs/evidence/fuji-verification.json',JSON.stringify(evidence,null,2)+'\n');m.status='verified';writeFileSync('config/deployment.json',JSON.stringify(m,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
