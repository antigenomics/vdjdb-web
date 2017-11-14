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
 */

package backend.models.authorization.token

import backend.models.authorization.tokens.verification.VerificationTokenProvider
import backend.models.authorization.user.UserProvider
import backend.models.{DatabaseProviderTestSpec, SQLDatabaseTestTag}

import scala.async.Async.{async, await}

class VerificationTokenProviderSpec extends DatabaseProviderTestSpec {
    implicit lazy val userProvider: UserProvider = app.injector.instanceOf[UserProvider]
    implicit lazy val verificationTokenProvider: VerificationTokenProvider = app.injector.instanceOf[VerificationTokenProvider]

    "VerificationTokenProvider" should {

        "be able to create verification token for new user" taggedAs SQLDatabaseTestTag in {
            async {
                val verificationToken = await(userProvider.createUser("login", "verificationmail@mail.com", "12345678"))

                val user = await(userProvider.get(verificationToken.userID))
                user should not be empty
                user.get.verified shouldEqual false

                val token = await(verificationTokenProvider.get(verificationToken.token))
                token should not be empty
            }
        }

        "get the same user in 'withUser' method" taggedAs SQLDatabaseTestTag in {
            async {
                val verificationToken = await(userProvider.createUser("login2", "verificationmail2@mail.com", "12345234791"))
                val userAssociatedWithToken = await(userProvider.get(verificationToken.userID))
                userAssociatedWithToken should not be empty

                val userWithToken = await(verificationTokenProvider.getWithUser(verificationToken.token))
                userWithToken should not be empty

                userAssociatedWithToken.get.id shouldEqual userWithToken.get._2.id
                userAssociatedWithToken.get.email shouldEqual userWithToken.get._2.email
                userAssociatedWithToken.get.login shouldEqual userWithToken.get._2.login

                verificationToken.userID shouldEqual userWithToken.get._1.userID
                verificationToken.expiredAt shouldEqual userWithToken.get._1.expiredAt
                verificationToken.token shouldEqual userWithToken.get._1.token
            }
        }
    }
}
