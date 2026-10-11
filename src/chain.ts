import { createPublicClient, createWalletClient, custom, http, parseAbi, type Address, type EIP1193Provider } from 'viem';
import { avalancheFuji } from 'viem/chains';
import deployment from '../config/deployment.json';
export const config = deployment as Omit<typeof deployment, 'backingToken'|'scenarioPool'|'referencePool'|'scenarioOracle'|'referenceOracle'> & {backingToken: Address | null; scenarioPool: Address | null; referencePool: Address | null; scenarioOracle: Address | null; referenceOracle: Address | null};
export const client = createPublicClient({ chain: avalancheFuji, transport: http(config.rpcUrl, {timeout:12000,retryCount:1}) });
export const poolAbi = parseAbi([
 'function totalBacking() view returns (uint256)', 'function reservedBacking() view returns (uint256)', 'function protectedAvax() view returns (uint256)', 'function juniorAvax() view returns (uint256)', 'function totalShares() view returns (uint256)', 'function nextPositionId() view returns (uint256)', 'function shares(address) view returns (uint256)', 'function withdrawalReadyAt(address) view returns (uint256)',
 'function maturity() view returns (uint256)', 'function claimableBacking(address) view returns (uint256)', 'function settleExpired(uint256 id)', 'function claimBacking()',
 'function positions(uint256) view returns (address owner,uint256 amount,uint256 floor,uint256 openedAt)', 'function depositJunior(uint256 amount,uint256 minShares) returns (uint256)', 'function protect(uint256 minFloor,uint256 deadline) payable returns (uint256)', 'function requestJuniorWithdrawal()', 'function withdrawJunior(uint256 burn,uint256 minBacking,uint256 minAvax)', 'function exitAvax(uint256 id,uint256 minAvax)', 'function exitBacking(uint256 id)',
 'event Protected(uint256 indexed id,address indexed owner,uint256 amount,uint256 floor)'
]);
export const tokenAbi = parseAbi(['function balanceOf(address) view returns(uint256)','function allowance(address,address) view returns(uint256)','function approve(address,uint256) returns(bool)','function faucet()','function nextClaim(address) view returns(uint256)']);
export const oracleAbi = parseAbi(['function price() view returns(uint256)']);
export const feedAbi = parseAbi(['function latestRoundData() view returns(uint80,int256,uint256,uint256,uint80)']);
declare global { interface Window { ethereum?: EIP1193Provider & {on?:(event:string, callback:(...args:any[])=>void)=>void;removeListener?:(event:string, callback:(...args:any[])=>void)=>void}; } }
export async function wallet() {
 if(!window.ethereum) throw new Error('Open this app in Core or another Ethereum-compatible wallet browser, or install its browser extension.');
 const w=createWalletClient({chain:avalancheFuji,transport:custom(window.ethereum)});
 const [account]=await w.requestAddresses();
 try { await w.switchChain({id:43113}); } catch(error:any) {
  if(error?.code===4902 || error?.cause?.code===4902) { await w.addChain({chain:avalancheFuji}); await w.switchChain({id:43113}); } else throw error;
 }
 if(await w.getChainId()!==43113) throw new Error('Switch your wallet to Avalanche Fuji before continuing.');
 return {w,account};
}
export const short = (s:string) => `${s.slice(0,6)}…${s.slice(-4)}`;
export const explorer = (type:'address'|'tx', id:string) => `${config.explorer}/${type}/${id}`;
