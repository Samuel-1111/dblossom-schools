CREATE TABLE `complaints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(40),
	`subject` varchar(180) NOT NULL,
	`message` text NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'New',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `complaints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`eventDate` varchar(20) NOT NULL,
	`imageUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `galleryImages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`imageUrl` varchar(500) NOT NULL,
	`altText` varchar(220),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `galleryImages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentName` varchar(160) NOT NULL,
	`className` varchar(20) NOT NULL,
	`amount` int NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'Pending',
	`paymentDate` varchar(20) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`studentName` varchar(160) NOT NULL,
	`className` varchar(20) NOT NULL,
	`term` varchar(30) NOT NULL,
	`session` varchar(20) NOT NULL,
	`subjectsJson` text NOT NULL,
	`totalScore` int NOT NULL DEFAULT 0,
	`average` int NOT NULL DEFAULT 0,
	`overallPercentage` int NOT NULL DEFAULT 0,
	`position` varchar(20),
	`teacherComment` text,
	`principalComment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(160) NOT NULL,
	`admissionNumber` varchar(40) NOT NULL,
	`className` varchar(20) NOT NULL,
	`gender` varchar(20),
	`dateOfBirth` varchar(20),
	`parentName` varchar(160),
	`parentPhone` varchar(40),
	`parentEmail` varchar(320),
	`boardingStatus` varchar(20),
	`password` varchar(120) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'Active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `students_id` PRIMARY KEY(`id`),
	CONSTRAINT `students_admissionNumber_unique` UNIQUE(`admissionNumber`)
);
--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(160) NOT NULL,
	`staffId` varchar(40) NOT NULL,
	`email` varchar(320),
	`phone` varchar(40),
	`subject` varchar(100),
	`role` varchar(40) NOT NULL DEFAULT 'Teaching Staff',
	`assignedClass` varchar(20),
	`password` varchar(120) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'Active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teachers_id` PRIMARY KEY(`id`),
	CONSTRAINT `teachers_staffId_unique` UNIQUE(`staffId`)
);
