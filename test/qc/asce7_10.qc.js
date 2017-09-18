/* global after, before, describe, it */
'use strict';


const ASCE7_10Handler = require('../../src/lib/asce7_10-handler'),
    CityInputs = require('../../etc/asce7_10-qc.json'),
    expect = require('chai').expect,
    extend = require('extend'),
    fs = require('fs'),
    https = require('https');

const epsilon = Config.epsilon || 1E-4;

let Config = require('../../src/conf/config.json'),
    ca,
    compareResult;

Config = extend(Config, process.env);

// Override generic configuration properties with site-specific properties
// as applicable.
if (Config.hasOwnProperty('database')) {
  Config.DB_HOST = Config.database;
}

if (Config.hasOwnProperty('pgsql_read_only_user')) {
  Config.DB_USER = Config.pgsql_read_only_user;
}

if (Config.hasOwnProperty('pgsql_read_only_password')) {
  Config.DB_PASSWORD = Config.pgsql_read_only_password;
}

// Config custom certificate chain
if (Config.SSL_CERT_FILE) {
  ca = fs.readFileSync(Config.SSL_CERT_FILE, 'utf-8');
  ca = ca.split('-----END CERTIFICATE-----').map((c) => {
    return c + '-----END CERTIFICATE-----';
  });
  https.globalAgent.options.ca = ca;
}

compareResult = function (expected, actual) {
  if (expected.hasOwnProperty('sms')) {
    if (expected.sms === null) {
      expect(actual.sms).to.equal(null);
    } else {
      expect(actual.sms).to.be.closeTo(expected.sms, epsilon);
    }
  }

  if (expected.hasOwnProperty('sm1')) {
    if (expected.sm1 === null) {
      expect(actual.sm1).to.equal(null);
    } else {
      expect(actual.sm1).to.be.closeTo(expected.sm1, epsilon);
    }
  }

  if (expected.hasOwnProperty('pgam')) {
    if (expected.pgam === null) {
      expect(actual.pgam).to.equal(null);
    } else {
      expect(actual.pgam).to.be.closeTo(expected.pgam, epsilon);
    }
  }

  if (expected.hasOwnProperty('t-sub-l')) {
    if (expected['t-sub-l'] === null) {
      expect(actual['t-sub-l']).to.equal(null);
    } else {
      expect(actual['t-sub-l']).to.be.closeTo(expected['t-sub-l'], epsilon);
    }
  }
};


describe(`ASCE 7-10 Quality Control Tests +/- ${epsilon}`, () => {
  let handler;

  before(() => {
    handler = ASCE7_10Handler(Config);
  });

  after(() => {
    handler.destroy();
    handler = null;
  });

  CityInputs.forEach((city) => {
    let label,
        latitude,
        longitude,
        riskCategory,
        title;

    label = city.request.parameters.label;
    latitude = city.request.parameters.latitude;
    longitude = city.request.parameters.longitude;
    riskCategory = 'I';
    title = 'QC_Test-ASCE7_10Handler';
    label = `${label} (${latitude}, ${longitude})`;

    describe(label, () => {
      let cityResponse,
          i,
          len,
          siteClass;

      len = city.response.data.length;
      for (i = 0; i < len; i++) {
        cityResponse = city.response.data[i];
        siteClass = cityResponse.siteClass;


        it(JSON.stringify(cityResponse), (done) => {
          let request;

          request = {
            latitude: latitude,
            longitude: longitude,
            siteClass: siteClass,
            riskCategory: riskCategory,
            title: title
          };

          handler.get(request).then((result) => {
            compareResult(cityResponse, result.data);
          }).catch((err) => {
            process.stderr.write(err.stack + '\n');
            return err;
          }).then(done);
        });
      }
    });
  });
});