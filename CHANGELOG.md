# Change Log

All notable changes to this project will be documented in this file starting from version **v1.1.0**.
This project adheres to [Semantic Versioning](http://semver.org/).

## [1.6.5] - 2016-06-08
### Changed

- #18 support redis URL: redis://USER:PASS@redis.com:5678

## [1.6.4] - 2016-06-07
### Changed

- Update dependencies.

## [1.6.3] - 2016-05-29
### Changed

- Improve performance.

## [1.6.2] - 2016-05-24
### Fixed

- Fixed for PubSub keyword 'message'.

## [1.6.1] - 2016-05-24
### Changed

- Remove "debug" module.
- Update dependencies.

## [1.6.0] - 2016-05-07
### Changed

- Support redis v3.2.

## [1.5.4] - 2016-03-16
### Changed

- Remove socket.cork account to a bug in node.js.

## [1.5.3] - 2016-03-14
### Changed

- Update dependencies.

## [1.5.2] - 2016-03-01
### Changed

- Improve connection.

### fixed

- fixed for old redis(v2.8.x).

## [1.5.1] - 2016-02-21
### Changed

- Update dependencies.
- Improve code.

## [1.5.0] - 2016-02-18
### Changed

- Remove auto-discover cluster nodes during initialization. Because the nodes information
from "cluster slots" command includes local-host information. But it will anto-connect
node by "MOVED" and "ASK".
- Change files structure.

## [1.4.1] - 2016-01-20
### Changed

- Update dependencies.

## [1.4.0] - 2015-12-29
### Changed

- change default `options.maxAttempts` to `5`.
- add `options.onlyMaster`, it is useful for replication mode.
- remove `options.handleError`.
- support IPv6.

## [1.3.0] - 2015-12-13
### Changed

- add `options.pingInterval`.
- add `client.clientConnect`.

## [1.2.4] - 2015-11-29
### Changed

- update dependencies.

## [1.2.3] - 2015-11-27
### fixed

- fixed for slave node.

## [1.2.2] - 2015-11-19
### Changed

- update description.

## [1.2.1] - 2015-11-18
### Changed

- Improve performance.

## [1.2.0] - 2015-11-12
### Changed

- Updated `thunks` to v4.0.0.

## [1.1.1] - 2015-10-07
### Changed

- Added `clientReady` method.

### Fixed

- Fixed command `evalauto`.
- Fixed for `ASK`.

## [1.1.0] - 2015-10-07
### Changed

- Added custom command `evalauto`.
- Used `const` instead of `var`.

### Fixed
