using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResearchNetwork.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddReviewRating : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "ReviewerAvgScore",
                table: "Users",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.CreateTable(
                name: "ReviewRatings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReviewRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    RatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Score = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReviewRatings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReviewRatings_ReviewRequests_ReviewRequestId",
                        column: x => x.ReviewRequestId,
                        principalTable: "ReviewRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReviewRatings_Users_RatedByUserId",
                        column: x => x.RatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReviewRatings_RatedByUserId",
                table: "ReviewRatings",
                column: "RatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewRatings_ReviewRequestId",
                table: "ReviewRatings",
                column: "ReviewRequestId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReviewRatings");

            migrationBuilder.DropColumn(
                name: "ReviewerAvgScore",
                table: "Users");
        }
    }
}
