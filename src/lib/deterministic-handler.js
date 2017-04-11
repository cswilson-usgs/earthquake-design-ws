'use strict';


var DeterministicFactory = require('./deterministic-factory'),
    extend = require('extend'),
    Pool = require('./db/pool');


var _DEFAULTS;

_DEFAULTS = {
  DB_DATABASE: 'postgres',
  DB_HOST: 'localhost',
  DB_PASSWORD: null,
  DB_PORT: 5432,
  DB_SCHEMA_DETERMINISTIC: 'deterministic',
  DB_USER: null
};


var DeterministicHandler = function (options) {
  var _this,
      _initialize;


  _this = {};

  _initialize = function (options) {
    options = extend(true, {}, _DEFAULTS, options);

    if (options.factory) {
      _this.factory = options.factory;
    } else {
      _this.destroyFactory = true;
      _this.factory = DeterministicFactory({
        db: _this.createDbPool(options)
      });
    }
  };


  _this.checkParams = function (params) {
    var buf,
        err,
        latitude,
        longitude,
        referenceDocument;

    buf = [];

    latitude = params.latitude;
    longitude = params.longitude;
    referenceDocument = params.referenceDocument;

    if (typeof latitude === 'undefined' || latitude === null) {
      buf.push('latitude');
    }

    if (typeof longitude === 'undefined' || longitude === null) {
      buf.push('longitude');
    }

    if (typeof referenceDocument === 'undefined' ||
        referenceDocument === null) {
      buf.push('referenceDocument');
    }

    if (buf.length > 0) {
      err = new Error('Missing required parameter' +
          (buf.length > 1 ? 's' : '') + ': ' + buf.join(', '));
      err.status = 400;
      return Promise.reject(err);
    }

    return Promise.resolve(params);
  };

  _this.createDbPool = function (options) {
    options = options || _DEFAULTS;

    if (!_this.db) {
      _this.destroyDb = true;
      _this.db = Pool(extend(true, {}, options,
          {DB_SCHEMA: options.DB_SCHEMA_DETERMINISTIC}));
    }

    return _this.db;
  };

  _this.destroy = function () {
    if (_this === null) {
      return;
    }

    if (_this.destroyFactory && _this.factory) {
      _this.factory.destroy();
      _this.factory = null;
    }

    if (_this.destroyDb) {
      _this.db.destroy(); // Technically async, but what would we do anyway?
    }

    _initialize = null;
    _this = null;
  };

  _this.formatResult = function (result) {
    return new Promise((resolve, reject) => {
      var formatted;

      try {
        formatted = {
          data: {
            pgad: result.data.pgad,
            s1d: result.data.s1d,
            ssd: result.data.ssd
          },
          metadata: {
            region_name: result.metadata.region.name,
            floor_pgad: result.metadata.document.floor_pgad,
            floor_s1d: result.metadata.document.floor_s1d,
            floor_ssd: result.metadata.document.floor_ssd,
            max_direction_pgad: result.metadata.document.max_direction_pgad,
            max_direction_s1d: result.metadata.document.max_direction_s1d,
            max_direction_ssd: result.metadata.document.max_direction_pgad,
            model_version: result.metadata.document.model_version,
            percentile_pgad: result.metadata.document.percentile_pgad,
            percentile_s1d: result.metadata.document.percentile_s1d,
            percentile_ssd: result.metadata.document.percentile_ssd
          }
        };

        return resolve(formatted);
      } catch (e) {
        return reject(e);
      }
    });
  };

  _this.get = function (params) {
    return _this.checkParams(params).then((params) => {
      return _this.factory.getDeterministicData(params);
    }).then((result) => {
      return _this.formatResult(result);
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = DeterministicHandler;
