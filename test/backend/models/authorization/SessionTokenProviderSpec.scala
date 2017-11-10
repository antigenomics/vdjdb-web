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
import backend.models.authorization.tokens.session.SessionTokenProvider
import backend.models.authorization.user.UserProvider

import scala.async.Async.{async, await}

class SessionTokenProviderSpec extends DatabaseProviderTestSpec {
    implicit lazy val sessionTokenProvider: SessionTokenProvider = app.injector.instanceOf[SessionTokenProvider]
    implicit lazy val userProvider: UserProvider = app.injector.instanceOf[UserProvider]


    "SessionTokenProvider" should {
        "be able to create session for verified user" taggedAs SQLDatabaseTestTag in {
            async {
                val token = await(userProvider.createUser("login", "mail1@mail.com", "123456"))
                val verifiedUser = await(userProvider.verifyUser(token))

                verifiedUser should not be empty
                verifiedUser.get.verified shouldEqual true

                val session = await(sessionTokenProvider.createSessionToken(verifiedUser.get))
                session should have length 255

                val sessionToken = await(sessionTokenProvider.get(session))
                sessionToken should not be empty
                sessionToken.get.userID shouldEqual verifiedUser.get.id
            }
        }

        "not be able to create session for unverified user" taggedAs SQLDatabaseTestTag in {
            async {
                val token = await(userProvider.createUser("login1", "mail2@mail.com", "123456"))
                val unverifiedUser = await(userProvider.get(token.userID))
                unverifiedUser should not be empty
                the [Exception] thrownBy {
                    sessionTokenProvider.createSessionToken(unverifiedUser.get)
                } should have message "Cannot create session for unverified user"
            }
        }

        "get the same user in 'withUser' method" taggedAs SQLDatabaseTestTag in {
            async {
                val token = await(userProvider.createUser("login2", "mail3@mail.com", "123456"))
                val user = await(userProvider.verifyUser(token))
                user should not be empty

                val session = await(sessionTokenProvider.createSessionToken(user.get))
                val sessionWithUser = await(sessionTokenProvider.getWithUser(session))

                sessionWithUser should not be empty
                sessionWithUser.get._1.token shouldEqual session
                sessionWithUser.get._1.userID shouldEqual user.get.id
                sessionWithUser.get._2 shouldEqual user.get

                val sessionAgain = await(sessionTokenProvider.get(session))
                sessionAgain should not be empty
                val userAgain = await(userProvider.get(sessionAgain.get.userID))
                userAgain should not be empty
                userAgain.get shouldEqual user.get
                userAgain.get shouldEqual sessionWithUser.get._2
            }
        }
    }
}
