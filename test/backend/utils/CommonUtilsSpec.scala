/*
 *     Copyright 2017 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */

package backend.utils

import backend.BaseTestSpec
import backend.actions.UtilsTestTag

class CommonUtilsSpec extends BaseTestSpec {
    "CommonUtils" should {
        "be able to create randomAlphaNumericString" taggedAs UtilsTestTag in {
            val string = CommonUtils.randomAlphaNumericString(32)

            string should have length 32
            string should fullyMatch regex """^[a-zA-z0-9]{32}$"""
        }

        "be able to create randomAlphabetString" taggedAs UtilsTestTag in {
            val string = CommonUtils.randomAlphabetString("abcdef")(64)

            string should have length 64
            string should fullyMatch regex """^[abcdef]{64}$"""
        }

        "be able to create randomAlphaString" taggedAs UtilsTestTag in {
            val string = CommonUtils.randomAlphaString(16)

            string should have length 16
            string should fullyMatch regex """^[a-z]{16}$"""
        }
    }
}
