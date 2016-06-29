// Licensed under the Apache License. See footer for details.

// workaround for "warning: possible EventEmitter memory leak detected"
// seems to be linked to the number of unit tests in the file
require("events").EventEmitter.prototype._maxListeners = 100;

// force unit test to load the in-memory db configuration
process.env.NODE_ENV = "unittest";

//------------------------------------------------------------------------------
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//------------------------------------------------------------------------------
