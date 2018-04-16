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

package backend.models.authorization.permissions

import backend.models.{DatabaseProviderTestSpec, SQLDatabaseTestTag}

import scala.async.Async.{async, await}

class UserPermissionsProviderSpec extends DatabaseProviderTestSpec {
    lazy implicit val userPermissionsProvider: UserPermissionsProvider = app.injector.instanceOf[UserPermissionsProvider]

    "UserPermissionsProvider" should {

        "have proper table name" taggedAs SQLDatabaseTestTag in {
            userPermissionsProvider.getTable.baseTableRow.tableName shouldEqual UserPermissionsTable.TABLE_NAME
        }

        "create default entries" taggedAs SQLDatabaseTestTag in {
            async {
                val permissions = await(userPermissionsProvider.getAll)
                permissions should have size 3

                permissions.map(permission => async {
                    permission.id match {
                        case 0 =>
                            permission.maxFilesCount shouldEqual -1
                            permission.maxFileSize shouldEqual -1
                            permission.isUploadAllowed shouldEqual true
                            permission.isDeleteAllowed shouldEqual true
                        case 1 =>
                            permission.maxFilesCount shouldEqual 10
                            permission.maxFileSize shouldEqual 16
                            permission.isUploadAllowed shouldEqual true
                            permission.isDeleteAllowed shouldEqual true
                        case 2 =>
                            permission.maxFilesCount shouldEqual 0
                            permission.maxFileSize shouldEqual 0
                            permission.isUploadAllowed shouldEqual false
                            permission.isDeleteAllowed shouldEqual false
                        case _ =>
                            fail("Non default user permission in database detected")
                    }
                }).assertAllAndAwait
            }
        }

    }
}
