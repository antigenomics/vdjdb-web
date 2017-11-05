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
import backend.models.authorization.permissions.UserPermissionsProvider
import backend.models.authorization.user.UserProvider
import backend.models.authorization.verification.VerificationTokenProvider

import scala.async.Async.{async, await}

class UserProviderSpec extends DatabaseProviderTestSpec {
    lazy implicit val userProvider: UserProvider = app.injector.instanceOf[UserProvider]
    lazy implicit val tokenProvider: VerificationTokenProvider = app.injector.instanceOf[VerificationTokenProvider]
    lazy implicit val userPermissionsProvider: UserPermissionsProvider = app.injector.instanceOf[UserPermissionsProvider]

    "UserProvider" should {

        "be able to create not-verified user" taggedAs SQLDatabaseTestTag in {
            async {
                val token = await(userProvider.createUser("testlogin", "test@mail.com", "password"))
                val user = await(userProvider.get(token.userID))
                user should not be empty

                user.get.login shouldEqual "testlogin"
                user.get.email shouldEqual "test@mail.com"
                user.get.verified shouldEqual false
                user.get.password shouldNot equal ("password")
                user.get.permissionID shouldEqual UserPermissionsProvider.DEFAULT_ID

                val verificationToken = await(tokenProvider.get(token.token))
                verificationToken should not be empty
                verificationToken.get.token shouldEqual token.token
            }
        }

        "not be able to create user with the same email" taggedAs SQLDatabaseTestTag in {
            async {
                val exception = await(recoverToExceptionIf[Exception] {
                    userProvider.createUser("testlogin", "test@mail.com", "password")
                })
                exception should have message "User already exists"
            }
        }

        "be able to verify user" taggedAs SQLDatabaseTestTag in {
            async {
                val tokens = await(tokenProvider.getAll)
                tokens should have size 1

                val token = tokens.head
                val success = await(tokenProvider.verify(token.token))
                success shouldEqual 1

                val user = await(userProvider.get(token.userID))
                user should not be empty

                user.get.id shouldEqual token.userID
                user.get.verified shouldEqual true

                val deleteToken = await(tokenProvider.get(token.token))
                deleteToken shouldBe empty
            }
        }

        "be able to delete expired tokens and user associated to these tokens" taggedAs SQLDatabaseTestTag in {
            async {
                val token1 = await(userProvider.createUser("user1", "user1@mail.ru", "user1password"))
                val token2 = await(userProvider.createUser("user2", "user2@mail.ru", "user2password"))


                succeed
            }
        }

    }

}
