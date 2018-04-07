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

import backend.models.{DatabaseProviderTestSpec, SQLDatabaseTestTag}
import backend.models.authorization.tokens.reset.{ResetTokenProvider, ResetTokenTable}
import backend.models.authorization.user.UserProvider
import backend.utils.TimeUtils

import scala.language.reflectiveCalls
import scala.async.Async.{async, await}
import scala.concurrent.Await
import scala.concurrent.duration.Duration

class ResetTokenProviderSpec extends DatabaseProviderTestSpec {
    implicit lazy val userProvider: UserProvider = app.injector.instanceOf[UserProvider]
    implicit lazy val resetTokenProvider: ResetTokenProvider = app.injector.instanceOf[ResetTokenProvider]

    trait SimpleTestUser {
        private final val _verificationToken = Await.result(userProvider.createUser("resetteset", "resettest@mail.com", "resettest"), Duration.Inf)
        private final val _user = Await.result(userProvider.verifyUser(_verificationToken), Duration.Inf)
        _user should not be empty

        final val user = _user.get
    }

    //noinspection TypeAnnotation
    final val fixtures = new {
        lazy val user = new SimpleTestUser { }
    }

    "Reset token provider" should {

        "have proper table name" taggedAs SQLDatabaseTestTag in {
            resetTokenProvider.getTable.baseTableRow.tableName shouldEqual ResetTokenTable.TABLE_NAME
        }

        "be able to create reset token for user" taggedAs SQLDatabaseTestTag in {
            async {
                val f = fixtures

                val tokenStr = await(resetTokenProvider.createResetToken(f.user.user))
                tokenStr should have length 32

                val token = await(resetTokenProvider.get(tokenStr))
                token should not be empty
                token.get.token shouldEqual tokenStr
                token.get.userID shouldEqual f.user.user.id
            }
        }

        "get the same user in 'withUser' method" taggedAs SQLDatabaseTestTag in {
            async {
                val f = fixtures

                val tokenStr = await(resetTokenProvider.createResetToken(f.user.user))
                val token = await(resetTokenProvider.get(tokenStr))
                token should not be empty

                val userAssociatedWithToken = await(userProvider.get(token.get.userID))
                val tokenWithUser = await(resetTokenProvider.getWithUser(tokenStr))

                userAssociatedWithToken should not be empty
                tokenWithUser should not be empty
                userAssociatedWithToken.get shouldEqual tokenWithUser.get._2
                token.get shouldEqual tokenWithUser.get._1
            }
        }

        "be able to delete expired reset tokens" taggedAs SQLDatabaseTestTag in {
            async {
                val f = fixtures

                val tokenStr = await(resetTokenProvider.createResetToken(f.user.user, TimeUtils.getExpiredAt(-1)))
                val token = await(resetTokenProvider.get(tokenStr))
                token should not be empty

                val _ = await(resetTokenProvider.deleteExpired())
                val expiredToken = await(resetTokenProvider.get(tokenStr))
                expiredToken should be (empty)
            }
        }

    }
}
