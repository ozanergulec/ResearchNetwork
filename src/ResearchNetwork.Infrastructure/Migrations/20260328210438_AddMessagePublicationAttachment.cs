using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResearchNetwork.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMessagePublicationAttachment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AttachedPublicationId",
                table: "Messages",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Messages_AttachedPublicationId",
                table: "Messages",
                column: "AttachedPublicationId");

            migrationBuilder.AddForeignKey(
                name: "FK_Messages_Publications_AttachedPublicationId",
                table: "Messages",
                column: "AttachedPublicationId",
                principalTable: "Publications",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Messages_Publications_AttachedPublicationId",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_Messages_AttachedPublicationId",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "AttachedPublicationId",
                table: "Messages");
        }
    }
}
