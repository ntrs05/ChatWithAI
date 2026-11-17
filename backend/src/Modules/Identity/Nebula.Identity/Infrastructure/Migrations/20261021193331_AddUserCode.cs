using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nebula.Identity.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUserCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "UserCode",
                table: "identity_users",
                type: "varchar(12)",
                maxLength: 12,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            // Tài khoản đã có trước migration này chưa có ID: cấp mỗi người một ID 8 chữ số duy nhất TRƯỚC khi tạo chỉ mục UNIQUE.
            // 10000000 + số thứ tự * 1000 + ngẫu nhiên(0..999): mỗi người một "khối" 1000 số riêng nên không bao giờ trùng nhau,
            // nhưng ID vẫn khó đoán. (Không dùng biến @n vì connection string không bật AllowUserVariables.)
            migrationBuilder.Sql(@"
                UPDATE identity_users u
                JOIN (SELECT Id, ROW_NUMBER() OVER (ORDER BY CreatedAt, Id) AS rn FROM identity_users) t ON t.Id = u.Id
                SET u.UserCode = CAST(10000000 + t.rn * 1000 + FLOOR(RAND() * 1000) AS CHAR)
                WHERE u.UserCode = '';");

            migrationBuilder.CreateIndex(
                name: "IX_identity_users_UserCode",
                table: "identity_users",
                column: "UserCode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_identity_users_UserCode",
                table: "identity_users");

            migrationBuilder.DropColumn(
                name: "UserCode",
                table: "identity_users");
        }
    }
}
