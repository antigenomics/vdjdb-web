/*
 *
 *       Copyright 2017 Bagaev Dmitry
 *
 *       Licensed under the Apache License, Version 2.0 (the "License");
 *       you may not use this file except in compliance with the License.
 *       You may obtain a copy of the License at
 *
 *           http://www.apache.org/licenses/LICENSE-2.0
 *
 *       Unless required by applicable law or agreed to in writing, software
 *       distributed under the License is distributed on an "AS IS" BASIS,
 *       WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *       See the License for the specific language governing permissions and
 *       limitations under the License.
 */

package backend.models.authorization

import backend.models.{DatabaseProviderTestSpec, SQLDatabaseTestTag}
import backend.models.authorization.user.UserProvider
import backend.models.authorization.verification.VerificationTokenProvider

import scala.async.Async.{async, await}

class VerificationTokenProviderSpec extends DatabaseProviderTestSpec {
    implicit lazy val userProvider: UserProvider = app.injector.instanceOf[UserProvider]
    implicit lazy val verificationTokenProvider: VerificationTokenProvider = app.injector.instanceOf[VerificationTokenProvider]

    "VerificationTokenProvider" should {
        "be able to create verification token for new user" taggedAs SQLDatabaseTestTag in {
            async {
                val verificationToken = await(userProvider.createUser("login", "mail@mail.com", "12345678"))

                val user = await(userProvider.get(verificationToken.userID))
                user should not be empty
                user.get.verified shouldEqual false

                val token = await(verificationTokenProvider.get(verificationToken.token))
                token should not be empty
            }
        }
    }
}
