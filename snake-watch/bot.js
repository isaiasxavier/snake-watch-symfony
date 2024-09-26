import {api, initApi} from './api.js';
import {Events} from "./events.js";
import xyk from "./handlers/xyk.mjs";
import lbp from "./handlers/lbp.js";
import omnipool from "./handlers/omnipool.js";
import stableswap from "./handlers/stableswap.js";
import router from "./handlers/router.js";
import transfers from "./handlers/transfers.js";
import otc from "./handlers/otc.js";
import dca from "./handlers/dca.js";
import staking from "./handlers/staking.js";
import referrals from "./handlers/referrals.js";
import {rpc, sha} from "./config.js";
import {currenciesHandler} from "./currencies.js";
import {main as omnipoolTransactionsMain} from './omnipoolTransactions.js';
import {main as xykTransactionsMain} from './xykTransactions.js';

async function main() {
    console.log('🐍⌚');
    console.log('snakewatch', sha);
    await initApi(rpc);
    const {rpc: {system}} = api();
    const [chain, version] = await Promise.all([system.chain(), system.version()]);
    console.log(`connected to ${rpc} (${chain} ${version})`);

    const events = new Events();
    events.addHandler(currenciesHandler);
    events.addHandler(xyk);
    events.addHandler(lbp);
    events.addHandler(omnipool);
    events.addHandler(stableswap);
    events.addHandler(router);
    events.addHandler(otc);
    events.addHandler(dca)
    events.addHandler(transfers);
    events.addHandler(staking);
    events.addHandler(referrals);

    if (process.env.NODE_ENV === 'test') {
        console.log('testing mode: pushing testing blocks');
        const blockNumbers = new Set([]);
        blockNumbers.add(4776718);
        blockNumbers.add(4012925);
        blockNumbers.add(3640483);
        blockNumbers.add(3640479);
        blockNumbers.add(3640440);
        blockNumbers.add(3640419);
        blockNumbers.add(3640110);

        for (const height of [...blockNumbers].sort()) {
            await events.emitFromBlock(height);
        }
        const lookBack = 100;
        console.log(`testing mode: pushing last ${lookBack} blocks`);
        const lastBlock = await api().query.system.number();
        for (let i = lastBlock - lookBack; i <= lastBlock; i++) {
            await events.emitFromBlock(i);
        }
    }

    console.log('watching for new blocks');
    events.startWatching();
    console.log('Trying to connect to RPC at:', rpc);

    // Inicializa omnipoolTransactions e xykTransactions
    await omnipoolTransactionsMain();
    await xykTransactionsMain();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});