'use strict';

const ngModule = angular.module('woServices');
ngModule.service('appConfigLawnchair', LawnchairDAO);
ngModule.service('accountLawnchair', LawnchairDAO);
export default LawnchairDAO;

/**
 * Handles generic caching of JSON objects in a lawnchair adapter
 */
function LawnchairDAO() {}

/**
 * Initialize the lawnchair database
 * @param  {String}   dbName   The name of the database
 * @return {Promise}
 */
LawnchairDAO.prototype.init = function(dbName) {
    return new Promise((resolve, reject) => {
        if (!dbName) {
            throw new Error('Lawnchair DB name must be specified!');
        }

        this._db = new Lawnchair({
            name: dbName
        }, success => success ? resolve() : reject(new Error('Lawnchair initialization ' + dbName + ' failed!')));
    });
};

/**
 * Create or update an object
 * @return {Promise}
 */
LawnchairDAO.prototype.persist = function(key, object) {
    return new Promise((resolve, reject) => {
        if (!key || !object) {
            throw new Error('Key and Object must be set!');
        }

        this._db.save({
            key: key,
            object: object
        }, persisted => (persisted.key !== key) ? reject(new Error('Persisting failed!')) : resolve());
    });
};

/**
 * Persist a bunch of items at once
 * @return {Promise}
 */
LawnchairDAO.prototype.batch = function(list) {
    return new Promise((resolve, reject) => {
        if (!(list instanceof Array)) {
            throw new Error('Input must be of type Array!');
        }

        this._db.batch(list, res => !res ? reject(new Error('Persisting batch failed!')) : resolve());
    });
};

/**
 * Read a single item by its key
 * @return {Promise}
 */
LawnchairDAO.prototype.read = function(key) {
    return new Promise(resolve => {
        if (!key) {
            throw new Error('Key must be specified!');
        }

        this._db.get(key, o => o ? resolve(o.object) : resolve());
    });
};

/**
 * List all the items of a certain type
 * @param type [String] The type of item e.g. 'email'
 * @return {Promise}
 */
LawnchairDAO.prototype.list = function(query, exactMatchOnly) {
    return new Promise(resolve => {
        let matchingKeys = [];

        // validate input
        if ((Array.isArray(query) && query.length === 0) || (!Array.isArray(query) && !query)) {
            throw new Error('Args not is not set!');
        }

        // this method operates on arrays of keys, so normalize input 'key' -> ['key']
        if (!Array.isArray(query)) {
            query = [query];
        }

        // get all keys
        this._db.keys(keys => {
            // check if there are keys in the db that start with the respective query
            matchingKeys = keys.filter(key => query.filter(type =>
                exactMatchOnly ? key === type : key.indexOf(type) === 0).length > 0);

            if (matchingKeys.length === 0) {
                // no matching keys, resolve
                resolve([]);
                return;
            }

            // fetch all items from data-store with matching keys
            this._db.get(matchingKeys, items => resolve(items.map(item => item.object)));
        });
    });
};

/**
 * Removes an object liter from local storage by its key (delete)
 * @return {Promise}
 */
LawnchairDAO.prototype.remove = function(key) {
    return new Promise((resolve, reject) => this._db.remove(key, err => err ? reject(err) : resolve()));
};

/**
 * Removes an object liter from local storage by its key (delete)
 * @return {Promise}
 */
LawnchairDAO.prototype.removeList = function(type) {
    return new Promise(resolve => {
        const matchingKeys = [];

        // validate type
        if (!type) {
            throw new Error('Type is not set!');
        }

        // get all keys that begins with type
        this._db.keys(keys => {
            keys.forEach(key => key.indexOf(type) === 0 && matchingKeys.push(key));
            resolve(matchingKeys);
        });

    }).then(matchingKeys => {
        // remove all matching keys
        const jobs = [];
        matchingKeys.forEach(key => jobs.push(this.remove(key)));

        return Promise.all(jobs);
    });
};

/**
 * Clears the whole local storage cache
 * @return {Promise}
 */
LawnchairDAO.prototype.clear = function() {
    return new Promise((resolve, reject) => this._db.nuke(err => err ? reject(err) : resolve()));
};