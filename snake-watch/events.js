import {api} from './api.js';

export class Events {
    listeners = [];

    on(section, method, addedCallback) {
        this.listeners.push({method, section, addedCallback});
        return this;
    }

    onFilter(section, method, filterPredicate, addedCallback) {
        this.listeners.push({method, section, filterPredicate, addedCallback});
        return this;
    }

    onSection(section, addedCallback) {
        this.listeners.push({section, addedCallback});
        return this;
    }

    addHandler(handler) {
        handler(this);
    }

    startWatching() {
        const apiInstance = api();
        if (apiInstance && apiInstance.rpc && apiInstance.rpc.chain && apiInstance.rpc.chain.getHeader) {
            apiInstance.rpc.chain.getHeader().then(header => {
                const block = header.number.toNumber();
                console.log(`Latest block number: ${block}`);
                this.emitFromBlock(block);
            }).catch(error => {
                console.error('Error fetching block header:', error);
            });
        } else {
            console.error("API or api().rpc.chain.getHeader is not available");
        }
    }


    stopWatching() {
        if (this.killWatcher) {
            this.killWatcher();
        }
    }

    async emit(events) {
        const listeners = this.listeners;
        const callbacks = events.flatMap(e => listeners
            .filter(({method, section, filterPredicate}) =>
                (method ? e.event.method === method : true)
                && (filterPredicate ? filterPredicate(e) : true)
                && (section ? e.event.section === section : true))
            .map(({addedCallback}) => [this.useHandledCallback(addedCallback), e])
        );
        for (const [callback, event] of callbacks) {
            await callback(event);
        }
        return callbacks.length;
    }

    async emitFromBlock(blocknumber) {
        console.log(`block ${blocknumber}`);
        return loadEvents(blocknumber)
            .then(events => this.emit(events))
            .catch(err => console.error(`failed to load ${blocknumber}:`, err.toString()));
    }

    useHandledCallback(callback) {
        return async (...args) => {
            let result;
            try {
                result = await callback(...args);
            } catch (e) {
                console.log(`processing of the event failed: ${e}`, args, e);
            }
            return result;
        };
    }
}

export const loadEvents = async blockNumber => api().rpc.chain.getBlockHash(blockNumber)
    .then(hash => api().query.system.events.at(hash))
    .then(events => processEvents(events, blockNumber));

export const processEvents = (events, blockNumber) => events.map(event => ({
    blockNumber,
    siblings: events
        .filter(({phase}) => (phase.isInitialization && event.phase.isInitialization)
            || phase.isApplyExtrinsic
            && event.phase.isApplyExtrinsic
            && phase.asApplyExtrinsic.eq(event.phase.asApplyExtrinsic))
        .map(({event}) => event),
    ...event
}));
export default class eventsModule {
}