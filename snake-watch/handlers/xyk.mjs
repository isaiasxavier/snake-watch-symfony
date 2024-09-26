import {addBotOutput} from '../bot.mjs';
import {
    formatAccount,
    formatAmount,
    formatUsdValue,
    getPrice,
    isWhale,
    loadCurrency,
    recordPrice,
    usdValue
} from "../currencies.mjs";
import {usdCurrencyId} from "../config.mjs";
import {notInRouter} from "./router.mjs";

export default function xykHandler(events) {
    events
        .onFilter('xyk', 'SellExecuted', notInRouter, sellHandler)
        .onFilter('xyk', 'BuyExecuted', notInRouter, buyHandler)
        .on('xyk', 'LiquidityAdded', liquidityAddedHandler)
        .on('xyk', 'LiquidityRemoved', liquidityRemovedHandler);
}

async function sellHandler({event}) {
    const {who, assetIn, assetOut, amount: amountIn, salePrice: amountOut} = event.data;
    return swapHandler({who, assetIn, assetOut, amountIn, amountOut});
}

async function buyHandler({event}) {
    const {who, assetIn, assetOut, amount: amountOut, buyPrice: amountIn} = event.data;
    return swapHandler({who, assetIn, assetOut, amountIn, amountOut});
}

// xyk.mjs
const usdcSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="28.8" height="28.8" viewBox="0 0 48 48" fill="none">
  <g clip-path="url(#clip0_2056_4492)">
    <rect x="-.055" y="-.055" width="48.11" height="48.11" rx="20.046" fill="#fff"/>
    <path d="M23.945 48.055A23.997 23.997 0 0 0 48 24 23.997 23.997 0 0 0 23.945-.055 23.997 23.997 0 0 0-.11 24a23.997 23.997 0 0 0 24.055 24.055z" fill="#2775CA"/>
    <path d="M30.56 27.809c0-3.508-2.105-4.711-6.314-5.212-3.007-.401-3.609-1.203-3.609-2.606 0-1.404 1.003-2.305 3.007-2.305 1.804 0 2.807.601 3.308 2.104.1.301.4.502.701.502h1.604c.401 0 .702-.301.702-.702v-.1a5.007 5.007 0 0 0-4.51-4.11v-2.405c0-.401-.301-.702-.802-.802h-1.504c-.4 0-.701.3-.802.802v2.305c-3.007.401-4.91 2.406-4.91 4.911 0 3.308 2.004 4.61 6.213 5.112 2.807.501 3.709 1.103 3.709 2.706 0 1.604-1.404 2.706-3.308 2.706-2.606 0-3.508-1.102-3.809-2.606-.1-.4-.4-.601-.701-.601H17.83c-.4 0-.702.3-.702.702v.1c.401 2.506 2.005 4.31 5.313 4.811v2.406c0 .4.3.701.801.801h1.504c.4 0 .701-.3.802-.801V33.12c3.007-.501 5.011-2.606 5.011-5.312z" fill="#fff"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M9.913 19.089c-2.907 7.718 1.102 16.438 8.92 19.244.3.2.602.601.602.902v1.403c0 .2 0 .3-.1.4-.1.402-.502.602-.903.402-5.613-1.804-9.923-6.114-11.727-11.727C3.698 20.191 8.91 10.068 18.432 7.061c.1-.1.3-.1.401-.1.401.1.602.4.602.802v1.403c0 .501-.2.802-.602 1.002-4.11 1.504-7.417 4.71-8.92 8.92zM28.555 7.462c.1-.4.502-.601.902-.4 5.513 1.803 9.923 6.113 11.727 11.826 3.007 9.522-2.205 19.645-11.726 22.652-.1.1-.301.1-.401.1-.401-.1-.602-.4-.602-.801v-1.404c0-.5.2-.802.602-1.002 4.109-1.503 7.417-4.71 8.92-8.92 2.907-7.718-1.102-16.438-8.92-19.244-.301-.201-.602-.602-.602-1.003V7.863c0-.2 0-.3.1-.4z" fill="#fff"/>
  </g>
  <defs>
    <clipPath id="clip0_2056_4492">
      <rect width="48" height="48" rx="24" fill="#fff"/>
    </clipPath>
  </defs>
</svg>`
const tetherSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="28.8" height="28.8" viewBox="0 0 48 48" fill="none">
  <g clip-path="url(#clip0_2067_3803)">
    <rect width="48" height="48" rx="20" fill="#fff"/>
    <path d="M47.277 29.806C44.07 42.663 31.049 50.488 18.19 47.282 5.337 44.075-2.488 31.053.72 18.197 3.923 5.338 16.945-2.487 29.799.718c12.859 3.206 20.683 16.23 17.477 29.088z" fill="#50AF95"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M27.037 26.72c-.17.014-1.046.066-3.002.066-1.556 0-2.66-.047-3.048-.065-6.011-.265-10.499-1.311-10.499-2.564 0-1.253 4.488-2.298 10.5-2.567v4.089c.392.028 1.518.094 3.074.094 1.866 0 2.801-.077 2.97-.093v-4.087c5.998.267 10.476 1.314 10.476 2.564s-4.476 2.297-10.477 2.563h.006zm0-5.55v-3.658h8.372v-5.58H12.615v5.58h8.37v3.657c-6.803.312-11.92 1.66-11.92 3.275s5.117 2.961 11.92 3.275v11.724h6.05V27.715c6.789-.312 11.896-1.659 11.896-3.272 0-1.614-5.103-2.96-11.896-3.274l.002.001z" fill="#fff"/>
  </g>
  <defs>
    <clipPath id="clip0_2067_3803">
      <rect width="48" height="48" rx="24" fill="#fff"/>
    </clipPath>
  </defs>
</svg>`
const assetHubSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="33.6" height="33.6" viewBox="0 0 48 48">
  <g transform="scale(0.4)">
    <path d="M47.797 23.95c0 13.136-10.649 23.796-23.797 23.796C10.852 47.746.203 37.094.203 23.95.203 10.801 10.86.156 24 .156c13.14 0 23.797 10.653 23.797 23.793zm0 0" fill="#321d47"/>
    <path d="M33.316 29.43h-5.07l-.953-2.325h-6.434l-.953 2.325h-5.07l6.066-13.82h6.336zM24.082 19.2l-1.68 4.124h3.352zm0 0" fill="#fff"/>
    <path d="M27.594 9.156a3.518 3.518 0 1 1-7.035.004 3.518 3.518 0 0 1 7.035-.004zm0 0M27.594 38.781a3.518 3.518 0 1 1-7.035.004 3.518 3.518 0 0 1 7.035-.004zm0 0M14.602 16.2a3.517 3.517 0 1 1-7.036 0 3.517 3.517 0 0 1 3.52-3.516 3.516 3.516 0 0 1 3.516 3.515zm0 0M40.59 16.2a3.517 3.517 0 1 1-7.035 0 3.517 3.517 0 0 1 3.52-3.516 3.516 3.516 0 0 1 3.515 3.515zm0 0M14.602 31.86a3.52 3.52 0 0 1-3.516 3.519 3.517 3.517 0 1 1 0-7.035 3.516 3.516 0 0 1 3.516 3.515zm0 0M40.59 31.86a3.52 3.52 0 0 1-3.516 3.519 3.517 3.517 0 1 1 0-7.035 3.516 3.516 0 0 1 3.516 3.515zm0 0" fill="#e6007a"/>
  </g>
</svg>`

export async function swapHandler({who, assetIn, assetOut, amountIn, amountOut}, action = `swapped`) {
    if (!assetIn || !assetOut) {
        console.error('Invalid asset IDs:', {assetIn, assetOut});
        return;
    }

    const sold = {currencyId: assetIn, amount: amountIn};
    const bought = {currencyId: assetOut, amount: amountOut};

    const currencyIn = await loadCurrency(assetIn);
    const currencyOut = await loadCurrency(assetOut);

    if (!currencyIn || !currencyOut) {
        console.error('Currency data not found for assets:', {assetIn, assetOut});
        return;
    }

    recordPrice(sold, bought);

    let value = await usdValue(bought) || (getPrice(assetOut, usdCurrencyId) ? amountOut / getPrice(assetOut, usdCurrencyId) : null);
    let soldValueInUsd = await usdValue(sold);

    const formattedSoldAmount = formatAmount(sold.amount, currencyIn);
    const formattedBoughtAmount = formatAmount(bought.amount, currencyOut);
    const formattedUsdValue = formatUsdValue(value);
    const formattedSoldValueInUsd = formatUsdValue(soldValueInUsd);

    const soldPoolDescription = (currencyIn.symbol === '4-Pool' || currencyIn.symbol === '2-Pool') ? '' : '';
    const boughtPoolDescription = (currencyOut.symbol === '4-Pool' || currencyOut.symbol === '2-Pool') ? '' : '';
    const formattedSoldAmountWithDescription = `${formattedSoldAmount}${soldPoolDescription}`;
    const formattedBoughtAmountWithDescription = `${formattedBoughtAmount}${boughtPoolDescription}`;

    const usdtValue = value ? ` ~ ${Math.round(value)} USDT` : '';

    const accountLink = `https://hydradx.subscan.io/account/${who}`;
    const formattedAccount = `<a href="${accountLink}" target="_blank"><span class="bg-red-500 text-white px-2 py-1 rounded">Wallet: ${formatAccount(who, isWhale(value))}</span></a>`;

    let message = `${formattedAccount} ${action} **${formattedSoldAmountWithDescription}** for **${formattedBoughtAmountWithDescription}**${usdtValue}`;

    // Se algum dos ativos for da "2-Pool", as imagens serão adicionadas ao texto
    if (currencyIn.symbol === '2-Pool' || currencyOut.symbol === '2-Pool') {
        const images = `
    <span style="position: relative; display: inline-flex; align-items: center;">
        <span style="position: relative;">
            ${tetherSvg}
            <span style="position: absolute; top: -5px; right: -5px;">
                ${assetHubSvg}
            </span>
        </span>
        <span style="position: relative;">
            ${usdcSvg}
            <span style="position: absolute; top: -5px; right: -5px;">
                ${assetHubSvg}
            </span>
        </span>
    </span>`;

        if (currencyIn.symbol === '2-Pool') {
            message = `${formattedAccount} ${action} ${formattedSoldAmountWithDescription} ${images} for ${formattedBoughtAmountWithDescription}${usdtValue}`;
        } else {
            message = `${formattedAccount} ${action} ${formattedSoldAmountWithDescription} for ${formattedBoughtAmountWithDescription} ${images}${usdtValue}`;
        }
    }


    addBotOutput(message);
}

export async function liquidityAddedHandler({event}) {
    const {who, assetA, assetB, amountA, amountB} = event.data;

    const currencyA = await loadCurrency(assetA);
    const currencyB = await loadCurrency(assetB);

    const formattedAmountA = formatAmount(amountA, currencyA);
    const formattedAmountB = formatAmount(amountB, currencyB);

    const valueA = await usdValue({currencyId: assetA, amount: amountA});
    const valueB = await usdValue({currencyId: assetB, amount: amountB});

    const totalValue = (valueA || 0) + (valueB || 0);

    let message = `💦 liquidity added as **${formattedAmountA}** + **${formattedAmountB}** by ${formatAccount(who, isWhale(totalValue))}`;
    if (![assetA, assetB].map(id => id.toString()).includes(usdCurrencyId)) {
        message += formatUsdValue(totalValue);
    }

    addBotOutput(message);
}

async function liquidityRemovedHandler({event, siblings}) {
    const {who, assetId: currencyId} = event.data;

    if (!siblings) {
        console.error('siblings is undefined');
        return;
    }

    const transfers = siblings
        .slice(0, siblings.indexOf(event))
        .reverse()
        .filter(({method, data: {to}}) => method === 'Transferred' && to.toString() === who.toString());

    let asset = transfers[0].data;
    let lrna = '';
    if (asset.currencyId.toNumber() === 1) {
        lrna = ' + ' + formatAmount(asset);
        asset = transfers[1].data;
    }
    const value = currencyId.toString() !== usdCurrencyId ? await usdValue(asset) : null;
    const message = `🚰 omnipool dehydrated of **${formatAmount(asset)}**${formatUsdValue(value)}${lrna} by ${formatAccount(who, isWhale(value))}`;
    addBotOutput(message);
}