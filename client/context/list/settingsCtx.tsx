'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { GameName, LobbyMemberRole } from 'shared/contracts/app'

export type AppLanguage = 'en' | 'uk'
export type AppFont = 'normal' | 'silly' | 'retro' | 'fancy' | 'orthodox'

type TranslationParams = Record<string, number | string>

const DEFAULT_LANGUAGE: AppLanguage = 'en'
const DEFAULT_FONT: AppFont = 'normal'
const LANGUAGE_STORAGE_KEY = 'next-game:language'
const FONT_STORAGE_KEY = 'next-game:font'

const translations = {
    en: {
        'app.title': 'Game Club',
        'settings.font.label': 'Font',
        'settings.language.label': 'Language',
        'settings.profile.label': 'Profile',
        'settings.font.option.normal': 'Ordinary',
        'settings.font.option.silly': 'Silly',
        'settings.font.option.retro': 'Retro',
        'settings.font.option.fancy': 'Fancy',
        'settings.font.option.orthodox': 'Orthodox',
        'settings.language.option.en': 'English',
        'settings.language.option.uk': 'Українська',
        'common.cancel': 'Cancel',
        'common.confirm': 'Confirm',
        'common.close': 'Close',
        'common.search': 'Search...',
        'common.password': 'Password',
        'common.create': 'Create',
        'common.update': 'Update',
        'common.play': 'Play',
        'common.watch': 'Watch',
        'common.chat': 'Chat',
        'common.online': 'Online',
        'common.pause': 'Pause',
        'common.resume': 'Resume',
        'common.skip': 'Skip',
        'common.reconnect': 'Reconnect',
        'common.connecting': 'Connecting...',
        'common.loading': 'Loading...',
        'common.answer': 'Answer',
        'common.confirmShort': 'Confirm',
        'common.approve': 'Approve',
        'common.decline': 'Decline',
        'common.end': 'End',
        'common.none': 'None',
        'common.current': 'Current',
        'common.player': 'Player',
        'common.action': 'Action',
        'common.correct': 'Correct',
        'common.incorrect': 'Incorrect',
        'common.wager': 'Wager',
        'common.rate': 'Rate',
        'common.game': 'Game',
        'common.home': 'Home',
        'game.ticTacToe': 'Tic Tac Toe',
        'game.clicker': 'Clicker',
        'game.jeopardy': 'Jeopardy',
        'role.player': 'player',
        'role.spectator': 'spectator',
        'player.role.master': 'Master',
        'player.role.player': 'Player',
        'members.count.one': '{count} member',
        'members.count.other': '{count} members',
        'login.welcome': 'Welcome',
        'login.title': 'Enter Game Club',
        'login.subtitle': 'Choose a nickname to hop into lobbies, chat, and game sessions.',
        'login.nicknamePlaceholder': 'Nickname',
        'login.enter': 'Enter',
        'login.entering': 'Entering...',
        'login.nicknameEmpty': 'Nickname cannot be empty.',
        'home.lobbies': 'Lobbies',
        'home.createLobby': 'Create lobby',
        'home.globalChat': 'Global Chat',
        'home.editProfile': 'Edit profile',
        'home.createLobbyModal': 'Create lobby',
        'lobby.access': 'Lobby Access',
        'lobby.joinTitle': 'Join {id}',
        'lobby.joinSubtitle': 'Open the lobby preview to join as a player or spectator.',
        'lobby.byCreator': 'by {name}',
        'lobby.invalidRole': 'Invalid role.',
        'lobby.joining': 'Joining lobby...',
        'lobbyPreview.password': 'Password',
        'lobbyCreator.lobbyName': 'Lobby name',
        'lobbyCreator.selectGame': 'Select a game',
        'lobbyCreator.validate': 'Validate',
        'lobbyCreator.validating': 'Validating...',
        'lobbyCreator.creating': 'Creating lobby...',
        'lobbyCreator.loadingSchema': 'Loading game setup...',
        'lobbyCreator.compatible': 'Compatible',
        'lobbyCreator.notCompatible': 'Not compatible',
        'lobbyCreator.compatibleDescription': 'This SIQ pack is supported by the current Jeopardy implementation.',
        'lobbyCreator.notCompatibleDescription': 'This SIQ pack uses features that the current Jeopardy implementation cannot run yet.',
        'lobbyCreator.showTechnicalReason': 'Show technical reason',
        'lobbyCreator.hideTechnicalReason': 'Hide technical reason',
        'lobbyCreator.field.background': 'Background',
        'lobbyCreator.field.pack': 'Pack',
        'profile.changeNicknameColor': 'Change nickname color',
        'profile.nickname': 'Nickname',
        'profile.saving': 'Saving profile...',
        'profile.logout': 'Log out',
        'profile.logoutTitle': 'Log out',
        'profile.logoutContent': "You won't be able to log into this profile again.",
        'profile.logoutHeader': 'Are you sure you want to log out?',
        'chat.writeMessage': 'Write a message...',
        'readyCheck.title': 'Ready check',
        'readyCheck.ready': 'Ready',
        'readyCheck.notReady': 'Not ready',
        'noSession.label': 'Session Gate',
        'noSession.title': 'No game in progress',
        'noSession.spectator': 'Players can start the session at any time. Floating chat and lobby controls stay around the frame.',
        'noSession.canStart': 'Start the session whenever you want. Ready check, leave, chat, and the rest of the lobby tools stay available around the frame.',
        'noSession.waiting': 'Waiting for the game master to start the session. Floating chat and lobby controls stay available around the frame.',
        'noSession.startGame': 'Start game',
        'noSession.startingGame': 'Starting game...',
        'lobbyControls.destroyTitle': 'Destroy lobby',
        'lobbyControls.destroyContent': 'Destroy this lobby?',
        'lobbyControls.leaveTitle': 'Leave lobby',
        'lobbyControls.leaveContent': 'Want to leave?',
        'lobbyControls.destroyLobby': 'Destroy lobby',
        'lobbyControls.readyCheck': 'Ready check',
        'lobbyControls.leaveLobby': 'Leave lobby',
        'lobbyControls.hideVolumeControls': 'Hide volume controls',
        'lobbyControls.showVolumeControls': 'Show volume controls',
        'lobbyControls.unmute': 'UNMUTE',
        'lobbyControls.mute': 'MUTE',
        'lobbyControls.unmuteLabel': 'Unmute',
        'lobbyControls.muteLabel': 'Mute',
        'lobbyControls.volume': 'Volume',
        'lobbyControls.menu': 'Lobby menu',
        'lobbyControls.hideChat': 'Hide chat',
        'lobbyControls.showChat': 'Show chat',
        'lobbyControls.adjustVolume': 'Adjust volume',
        'lobbyControls.preferences': 'Preferences',
        'lobbyControls.startReadyCheck': 'Start ready check',
        'lobbyControls.hidePreferences': 'Hide preferences',
        'lobbyControls.lobbyChat': 'Lobby Chat',
        'lobbyControls.showPreferences': 'Show preferences',
        'lobby.systemName': 'Lobby',
        'lobby.system.joinedAs': ' joined as ',
        'lobby.system.left': ' left the lobby.',
        'lobby.system.tipped': ' tipped ',
        'lobby.system.kicked': ' has been kicked.',
        'lobby.system.jeopardy.pickedSpecial': ' picked a ',
        'lobby.system.jeopardy.inTheme': ' question in ',
        'lobby.system.jeopardy.forValue': ' for {value}',
        'lobby.system.jeopardy.skippedCategory': ' skipped category ',
        'lobby.system.jeopardy.skippedFinalTheme': ' skipped final theme ',
        'lobby.destroyed': 'Lobby has been destroyed',
        'lobby.kickedToast': '{name} has been kicked',
        'jeopardy.theButton': 'THE BUTTON',
        'jeopardy.verifyAnswer': 'Verify Answer',
        'jeopardy.answerLabel': 'Answer: {answer}',
        'jeopardy.noAnswer': 'no answer',
        'jeopardy.submittedAnswers': 'Submitted Answers',
        'jeopardy.approveHalf': 'Approve 1/2',
        'jeopardy.approveThird': 'Approve 1/3',
        'jeopardy.choosePlayer': 'Choose Player',
        'jeopardy.hiddenStake': 'Hidden Stake',
        'jeopardy.questionValue': 'Question Value',
        'jeopardy.yourAnswer': 'Your Answer',
        'jeopardy.finalBet': 'Final Bet',
        'jeopardy.confirmBet': 'Confirm Bet',
        'jeopardy.finalAnswer': 'Final Answer',
        'jeopardy.submitAnswer': 'Submit Answer',
        'jeopardy.finalTheme': 'Final Theme',
        'jeopardy.finalQuestion': 'Final Question',
        'jeopardy.verifyFinalAnswers': 'Verify Final Answers',
        'jeopardy.finalAnswers': 'Final Answers',
        'jeopardy.winner': 'Winner',
        'jeopardy.pause': 'Pause',
        'jeopardy.packLoading': 'Pack loading',
        'jeopardy.referenceAnswers': 'Answer Guide',
        'jeopardy.fullscreenMedia': 'Fullscreen',
        'jeopardy.collapseMedia': 'Back to Card',
        'jeopardy.answerStatus.approved': 'Approved',
        'jeopardy.answerStatus.approvedHalf': 'Approved 1/2',
        'jeopardy.answerStatus.approvedThird': 'Approved 1/3',
        'jeopardy.answerStatus.declined': 'Declined',
        'jeopardy.answerStatus.current': 'Current',
        'jeopardy.questionType.forAll': 'For All',
        'jeopardy.questionType.forYourself': 'For Yourself',
        'jeopardy.questionType.noRisk': 'No Risk',
        'jeopardy.questionType.secret': 'Secret',
        'jeopardy.questionType.secretNoQuestion': 'Secret Gift',
        'jeopardy.questionType.secretPublicPrice': 'Secret',
        'jeopardy.questionType.stake': 'Stake',
        'jeopardy.questionType.stakeAll': 'Stake for All',
        'ws.connectPrompt': 'Connect to the room server to continue.',
        'error.notification.close': 'Close error notification',
        'error.details.show': 'Show details',
        'error.details.hide': 'Hide details',
        'error.details.context': 'Context',
        'error.details.code': 'Code',
        'error.details.message': 'Message',
        'error.details.requestPayload': 'Request payload',
        'error.details.details': 'Details',
        'error.details.stack': 'Stack',
        'error.404': '404 Not found',
        'playerMenu.tip': 'Tip',
        'playerMenu.kick': 'Kick',
        'playerMenu.setScore': 'Set score',
        'playerMenu.kickTitle': 'Kick player',
        'playerMenu.kickContent': 'Want to kick {name}?',
        'playerMenu.setScoreTitle': 'Set score',
        'playerMenu.setScorePrompt': 'Set score for {name}',
        'playerMenu.scoreValue': 'Score value',
        'playerMenu.scoreInputMissing': 'Cannot find the score input element.',
        'tictactoe.winnerToast': '{name} won!',
        'tictactoe.drawToast': 'Draw!',
        'ws.error.messageNotSent': 'Message not sent',
        'ws.error.actionFailed': 'Action failed',
        'ws.error.gameNotStarted': 'Game not started',
        'ws.error.kickFailed': 'Kick failed',
        'ws.error.readyCheckFailed': 'Ready check failed',
        'ws.error.tipFailed': 'Tip failed',
        'ws.error.readyCheckResponseFailed': 'Ready check response failed',
        'ws.error.requestFailed': 'Request failed',
        'ws.error.fallback.chatSend': 'We could not send that message. Please try again.',
        'ws.error.fallback.gameSendAction': 'We could not complete that game action. Please try again.',
        'ws.error.fallback.gameStart': 'We could not start the game. Please try again.',
        'ws.error.fallback.lobbyKick': 'We could not remove that player from the lobby. Please try again.',
        'ws.error.fallback.readyStart': 'We could not start the ready check. Please try again.',
        'ws.error.fallback.tip': 'We could not send that tip. Please try again.',
        'ws.error.fallback.readyResponse': 'We could not submit your ready check response. Please try again.',
        'ws.error.fallback.unknown': 'We could not complete that request. Please try again.',
        'ws.error.socketNotReady': 'The live lobby connection is not ready yet. Please try again in a moment.',
        'ws.error.failedToLoadLobby': 'Failed to load lobby',
        'ws.error.failedToLoadChat': 'Failed to load chat',
        'ws.error.failedToLoadUsers': 'Failed to load users',
        'ws.error.failedToLoadUsersCount': 'Failed to load users count',
        'errors.lobbyIdInvalid': 'Lobby ID is not valid.',
        'errors.registrationFailed': 'Registration failed.',
        'errors.profileFormData': 'Profile payload must be FormData.',
        'errors.lobbyCreateFormData': 'Lobby create payload must be FormData.',
        'errors.realtimeApiNotSupported': 'The realtime API does not support {gameName} yet.',
        'errors.errorDuringLobbyCreation': 'Error during lobby creation',
        'errors.failedToValidatePack': 'Failed to validate Jeopardy pack',
        'errors.failedToDestroyLobby': 'Failed to destroy lobby',
        'errors.failedToUpdateProfile': 'Failed to update profile',
        'errors.cannotLobby': 'Cannot open lobby with id: {id}',
        'errors.incorrectPassword': 'Incorrect password.',
        'errors.messageCannotBeEmpty': 'Message cannot be empty.',
        'errors.onlyPlayersCanStartGame': 'Only players can start the game.',
        'errors.onlyPlayersCanStartClicker': 'Only players can start Clicker.',
        'errors.onlyPlayersCanClick': 'Only players can click.',
        'errors.clickerRequiresPlayer': 'Clicker requires at least 1 player.',
        'errors.onlyPlayersCanStartTicTacToe': 'Only players can start the game.',
        'errors.ticTacToeRequiresTwoPlayers': 'TicTacToe requires exactly 2 players.',
        'errors.onlyPlayersCanMakeMoves': 'Only players can make moves.',
        'errors.noActiveGame': 'There is no active game.',
        'errors.notYourTurn': 'It is not your turn.',
        'errors.invalidBoardCell': 'Invalid board cell.',
        'errors.cellAlreadyTaken': 'Cell is already taken.',
        'errors.readyCheckDuringGame': 'Cannot start a ready check during an active game.',
        'errors.noActiveReadyCheck': 'There is no active ready check.',
        'errors.onlyActivePlayersReadyCheck': 'Only active players can respond to the ready check.',
        'errors.joinRoomBeforeResponding': 'Join the room before responding.',
        'errors.joinRoomBeforeSendingMessages': 'Join the room before sending messages.',
        'errors.joinRoomBeforeTipping': 'Join the room before tipping.',
        'errors.tipTargetNotInRoom': 'Tip target is not in this room.',
        'errors.cannotTipYourself': 'You cannot tip yourself.',
        'errors.memberNotFound': 'Member not found.',
        'errors.playerSlotsFull': 'Player slots are full.',
        'errors.invalidJoinRole': 'Invalid join role.',
        'errors.kickTargetRequired': 'Kick target is required.',
        'errors.readyStateRequired': 'Ready state is required.',
        'errors.joinRoomFirst': 'Join the room before continuing.',
        'errors.lobbyNotFound': 'Lobby not found.',
        'image.alt.profileAvatar': 'Profile avatar',
        'image.alt.userAvatar': 'User avatar',
        'image.alt.winnerPicture': 'Winner picture',
        'image.alt.questionImage': 'Question image',
        'image.alt.audioQuestion': 'Audio question'
    },
    uk: {
        'app.title': 'Game Club',
        'settings.font.label': 'Шрифт',
        'settings.language.label': 'Мова',
        'settings.profile.label': 'Профіль',
        'settings.font.option.normal': 'Звичайний',
        'settings.font.option.silly': 'Дурненький',
        'settings.font.option.retro': 'Ретро',
        'settings.font.option.fancy': 'Модний',
        'settings.font.option.orthodox': 'Православний',
        'settings.language.option.en': 'English',
        'settings.language.option.uk': 'Українська',
        'common.cancel': 'Скасувати',
        'common.confirm': 'Підтвердити',
        'common.close': 'Закрити',
        'common.search': 'Пошук...',
        'common.password': 'Пароль',
        'common.create': 'Створити',
        'common.update': 'Оновити',
        'common.play': 'Грати',
        'common.watch': 'Дивитися',
        'common.chat': 'Чат',
        'common.online': 'Онлайн',
        'common.pause': 'Пауза',
        'common.resume': 'Продовжити',
        'common.skip': 'Пропустити',
        'common.reconnect': 'Підключитися знову',
        'common.connecting': 'Підключення...',
        'common.loading': 'Завантаження...',
        'common.answer': 'Відповідь',
        'common.confirmShort': 'Підтвердити',
        'common.approve': 'Зарахувати',
        'common.decline': 'Відхилити',
        'common.end': 'Завершити',
        'common.none': 'Немає',
        'common.current': 'Поточна',
        'common.player': 'Гравець',
        'common.action': 'Дія',
        'common.correct': 'Правильно',
        'common.incorrect': 'Неправильно',
        'common.wager': 'Ставка',
        'common.rate': 'Оцінка',
        'common.game': 'Гра',
        'common.home': 'Головна',
        'game.ticTacToe': 'Хрестики-нулики',
        'game.clicker': 'Клікер',
        'game.jeopardy': 'Надгра (.siq)',
        'role.player': 'гравець',
        'role.spectator': 'глядач',
        'player.role.master': 'Ведучий',
        'player.role.player': 'Гравець',
        'members.count.one': '{count} учасник',
        'members.count.other': '{count} учасників',
        'login.welcome': 'Вітаємо',
        'login.title': 'Увійти до Game Club',
        'login.subtitle': 'Оберіть нікнейм, щоб заходити в лобі, спілкуватися в чаті та грати.',
        'login.nicknamePlaceholder': 'Нікнейм',
        'login.enter': 'Увійти',
        'login.entering': 'Вхід...',
        'login.nicknameEmpty': 'Нікнейм не може бути порожнім.',
        'home.lobbies': 'Лобі',
        'home.createLobby': 'Створити лобі',
        'home.globalChat': 'Глобальний чат',
        'home.editProfile': 'Редагувати профіль',
        'home.createLobbyModal': 'Створити лобі',
        'lobby.access': 'Доступ до лобі',
        'lobby.joinTitle': 'Приєднатися до {id}',
        'lobby.joinSubtitle': 'Відкрийте перегляд лобі, щоб приєднатися як гравець або глядач.',
        'lobby.byCreator': 'від {name}',
        'lobby.invalidRole': 'Некоректна роль.',
        'lobby.joining': 'Вхід до лобі...',
        'lobbyPreview.password': 'Пароль',
        'lobbyCreator.lobbyName': 'Назва лобі',
        'lobbyCreator.selectGame': 'Оберіть гру',
        'lobbyCreator.validate': 'Перевірити',
        'lobbyCreator.validating': 'Перевірка...',
        'lobbyCreator.creating': 'Створення лобі...',
        'lobbyCreator.loadingSchema': 'Завантаження параметрів гри...',
        'lobbyCreator.compatible': 'Сумісний',
        'lobbyCreator.notCompatible': 'Несумісний',
        'lobbyCreator.compatibleDescription': 'Цей SIQ-пак підтримується поточною реалізацією Jeopardy.',
        'lobbyCreator.notCompatibleDescription': 'У цьому SIQ-паку є функції, які поточна реалізація Jeopardy ще не вміє запускати.',
        'lobbyCreator.showTechnicalReason': 'Показати технічну причину',
        'lobbyCreator.hideTechnicalReason': 'Сховати технічну причину',
        'lobbyCreator.field.background': 'Тло',
        'lobbyCreator.field.pack': 'Пак',
        'profile.changeNicknameColor': 'Змінити колір нікнейма',
        'profile.nickname': 'Нікнейм',
        'profile.saving': 'Збереження профілю...',
        'profile.logout': 'Вийти',
        'profile.logoutTitle': 'Вийти',
        'profile.logoutContent': 'Ви більше не зможете увійти до цього профілю.',
        'profile.logoutHeader': 'Ви впевнені, що хочете вийти?',
        'chat.writeMessage': 'Напишіть повідомлення...',
        'readyCheck.title': 'Перевірка готовності',
        'readyCheck.ready': 'Готовий',
        'readyCheck.notReady': 'Не готовий',
        'noSession.label': 'Старт сесії',
        'noSession.title': 'Гра ще не почалася',
        'noSession.spectator': 'Гравці можуть запустити сесію будь-якої миті. Плаваючий чат і керування лобі залишаються доступними навколо ігрового поля.',
        'noSession.canStart':
            'Запускайте сесію коли захочете. Перевірка готовності, вихід, чат та інші інструменти лобі залишаються доступними навколо ігрового поля.',
        'noSession.waiting': 'Очікуємо, поки ведучий запустить сесію. Плаваючий чат і керування лобі залишаються доступними навколо ігрового поля.',
        'noSession.startGame': 'Почати гру',
        'noSession.startingGame': 'Запуск гри...',
        'lobbyControls.destroyTitle': 'Знищити лобі',
        'lobbyControls.destroyContent': 'Знищити це лобі?',
        'lobbyControls.leaveTitle': 'Покинути лобі',
        'lobbyControls.leaveContent': 'Хочете піти?',
        'lobbyControls.destroyLobby': 'Знищити лобі',
        'lobbyControls.readyCheck': 'Перевірка готовності',
        'lobbyControls.leaveLobby': 'Покинути лобі',
        'lobbyControls.hideVolumeControls': 'Сховати керування гучністю',
        'lobbyControls.showVolumeControls': 'Показати керування гучністю',
        'lobbyControls.unmute': 'УВІМКНУТИ',
        'lobbyControls.mute': 'ВИМКНУТИ',
        'lobbyControls.unmuteLabel': 'Увімкнути звук',
        'lobbyControls.muteLabel': 'Вимкнути звук',
        'lobbyControls.volume': 'Гучність',
        'lobbyControls.menu': 'Меню лобі',
        'lobbyControls.hideChat': 'Сховати чат',
        'lobbyControls.showChat': 'Показати чат',
        'lobbyControls.adjustVolume': 'Налаштувати гучність',
        'lobbyControls.preferences': 'Налаштування',
        'lobbyControls.startReadyCheck': 'Почати перевірку готовності',
        'lobbyControls.hidePreferences': 'Сховати налаштування',
        'lobbyControls.lobbyChat': 'Чат лобі',
        'lobbyControls.showPreferences': 'Показати налаштування',
        'lobby.systemName': 'Лобі',
        'lobby.system.joinedAs': ' приєднався як ',
        'lobby.system.left': ' покинув лобі.',
        'lobby.system.tipped': ' кинув монетку ',
        'lobby.system.kicked': ' було вигнано.',
        'lobby.system.jeopardy.pickedSpecial': ' обрав спеціальне питання ',
        'lobby.system.jeopardy.inTheme': ' у темі ',
        'lobby.system.jeopardy.forValue': ' за {value}',
        'lobby.system.jeopardy.skippedCategory': ' пропустив категорію ',
        'lobby.system.jeopardy.skippedFinalTheme': ' пропустив фінальну тему ',
        'lobby.destroyed': 'Лобі було знищено',
        'lobby.kickedToast': '{name} було вигнано',
        'jeopardy.theButton': 'КНОПКА',
        'jeopardy.verifyAnswer': 'Перевірка відповіді',
        'jeopardy.answerLabel': 'Відповідь: {answer}',
        'jeopardy.noAnswer': 'немає відповіді',
        'jeopardy.submittedAnswers': 'Надані відповіді',
        'jeopardy.approveHalf': 'Зарахувати 1/2',
        'jeopardy.approveThird': 'Зарахувати 1/3',
        'jeopardy.choosePlayer': 'Оберіть гравця',
        'jeopardy.hiddenStake': 'Прихована ставка',
        'jeopardy.questionValue': 'Вартість питання',
        'jeopardy.yourAnswer': 'Ваша відповідь',
        'jeopardy.finalBet': 'Фінальна ставка',
        'jeopardy.confirmBet': 'Підтвердити ставку',
        'jeopardy.finalAnswer': 'Фінальна відповідь',
        'jeopardy.submitAnswer': 'Надіслати відповідь',
        'jeopardy.finalTheme': 'Фінальна тема',
        'jeopardy.finalQuestion': 'Фінальне питання',
        'jeopardy.verifyFinalAnswers': 'Перевірка фінальних відповідей',
        'jeopardy.finalAnswers': 'Фінальні відповіді',
        'jeopardy.winner': 'Переможець',
        'jeopardy.pause': 'Пауза',
        'jeopardy.packLoading': 'Завантаження паку',
        'jeopardy.referenceAnswers': 'Підказка для перевірки',
        'jeopardy.fullscreenMedia': 'На весь екран',
        'jeopardy.collapseMedia': 'Назад до картки',
        'jeopardy.answerStatus.approved': 'Зараховано',
        'jeopardy.answerStatus.approvedHalf': 'Зараховано 1/2',
        'jeopardy.answerStatus.approvedThird': 'Зараховано 1/3',
        'jeopardy.answerStatus.declined': 'Відхилено',
        'jeopardy.answerStatus.current': 'Поточна',
        'jeopardy.questionType.forAll': 'Своя гра',
        'jeopardy.questionType.forYourself': 'Своя гра без ризику',
        'jeopardy.questionType.noRisk': 'Без ризику',
        'jeopardy.questionType.secret': 'Кот в мішку',
        'jeopardy.questionType.secretNoQuestion': 'Подарунок',
        'jeopardy.questionType.secretPublicPrice': 'Кот в мішку',
        'jeopardy.questionType.stake': 'Аукціон',
        'jeopardy.questionType.stakeAll': 'Аукціон для всіх',
        'ws.connectPrompt': 'Щоб продовжити, підключіться до сервера кімнати.',
        'error.notification.close': 'Закрити сповіщення про помилку',
        'error.details.show': 'Показати деталі',
        'error.details.hide': 'Сховати деталі',
        'error.details.context': 'Контекст',
        'error.details.code': 'Код',
        'error.details.message': 'Повідомлення',
        'error.details.requestPayload': 'Тіло запиту',
        'error.details.details': 'Деталі',
        'error.details.stack': 'Стек',
        'error.404': '404 Не знайдено',
        'playerMenu.tip': 'Кинути монетку',
        'playerMenu.kick': 'Вигнати',
        'playerMenu.setScore': 'Задати рахунок',
        'playerMenu.kickTitle': 'Вигнати гравця',
        'playerMenu.kickContent': 'Вигнати {name}?',
        'playerMenu.setScoreTitle': 'Задати рахунок',
        'playerMenu.setScorePrompt': 'Задати рахунок для {name}',
        'playerMenu.scoreValue': 'Значення рахунку',
        'playerMenu.scoreInputMissing': 'Не вдалося знайти поле для рахунку.',
        'tictactoe.winnerToast': '{name} переміг!',
        'tictactoe.drawToast': 'Нічия!',
        'ws.error.messageNotSent': 'Повідомлення не надіслано',
        'ws.error.actionFailed': 'Дію не виконано',
        'ws.error.gameNotStarted': 'Гру не запущено',
        'ws.error.kickFailed': 'Не вдалося вигнати',
        'ws.error.readyCheckFailed': 'Не вдалося запустити перевірку готовності',
        'ws.error.tipFailed': 'Не вдалося кинути монетку',
        'ws.error.readyCheckResponseFailed': 'Не вдалося надіслати відповідь про готовність',
        'ws.error.requestFailed': 'Запит не виконано',
        'ws.error.fallback.chatSend': 'Не вдалося надіслати повідомлення. Спробуйте ще раз.',
        'ws.error.fallback.gameSendAction': 'Не вдалося виконати ігрову дію. Спробуйте ще раз.',
        'ws.error.fallback.gameStart': 'Не вдалося почати гру. Спробуйте ще раз.',
        'ws.error.fallback.lobbyKick': 'Не вдалося видалити цього гравця з лобі. Спробуйте ще раз.',
        'ws.error.fallback.readyStart': 'Не вдалося почати перевірку готовності. Спробуйте ще раз.',
        'ws.error.fallback.tip': 'Не вдалося кинути монетку. Спробуйте ще раз.',
        'ws.error.fallback.readyResponse': 'Не вдалося надіслати вашу відповідь про готовність. Спробуйте ще раз.',
        'ws.error.fallback.unknown': 'Не вдалося виконати цей запит. Спробуйте ще раз.',
        'ws.error.socketNotReady': 'Живе з’єднання з лобі ще не готове. Спробуйте ще раз за мить.',
        'ws.error.failedToLoadLobby': 'Не вдалося завантажити лобі',
        'ws.error.failedToLoadChat': 'Не вдалося завантажити чат',
        'ws.error.failedToLoadUsers': 'Не вдалося завантажити користувачів',
        'ws.error.failedToLoadUsersCount': 'Не вдалося завантажити кількість користувачів',
        'errors.lobbyIdInvalid': 'Некоректний ID лобі.',
        'errors.registrationFailed': 'Реєстрація не вдалася.',
        'errors.profileFormData': 'Дані профілю мають бути FormData.',
        'errors.lobbyCreateFormData': 'Дані створення лобі мають бути FormData.',
        'errors.realtimeApiNotSupported': 'Realtime API поки не підтримує {gameName}.',
        'errors.errorDuringLobbyCreation': 'Помилка під час створення лобі',
        'errors.failedToValidatePack': 'Не вдалося перевірити пак Jeopardy',
        'errors.failedToDestroyLobby': 'Не вдалося знищити лобі',
        'errors.failedToUpdateProfile': 'Не вдалося оновити профіль',
        'errors.cannotLobby': 'Не вдалося відкрити лобі з id: {id}',
        'errors.incorrectPassword': 'Неправильний пароль.',
        'errors.messageCannotBeEmpty': 'Повідомлення не може бути порожнім.',
        'errors.onlyPlayersCanStartGame': 'Лише гравці можуть почати гру.',
        'errors.onlyPlayersCanStartClicker': 'Лише гравці можуть почати Clicker.',
        'errors.onlyPlayersCanClick': 'Лише гравці можуть клікати.',
        'errors.clickerRequiresPlayer': 'Для Clicker потрібен хоча б 1 гравець.',
        'errors.onlyPlayersCanStartTicTacToe': 'Лише гравці можуть почати гру.',
        'errors.ticTacToeRequiresTwoPlayers': 'Для Tic Tac Toe потрібно рівно 2 гравці.',
        'errors.onlyPlayersCanMakeMoves': 'Лише гравці можуть робити ходи.',
        'errors.noActiveGame': 'Немає активної гри.',
        'errors.notYourTurn': 'Зараз не ваш хід.',
        'errors.invalidBoardCell': 'Некоректна клітинка поля.',
        'errors.cellAlreadyTaken': 'Клітинка вже зайнята.',
        'errors.readyCheckDuringGame': 'Не можна почати перевірку готовності під час активної гри.',
        'errors.noActiveReadyCheck': 'Немає активної перевірки готовності.',
        'errors.onlyActivePlayersReadyCheck': 'Лише активні гравці можуть відповісти на перевірку готовності.',
        'errors.joinRoomBeforeResponding': 'Спочатку приєднайтеся до кімнати.',
        'errors.joinRoomBeforeSendingMessages': 'Спочатку приєднайтеся до кімнати, щоб надсилати повідомлення.',
        'errors.joinRoomBeforeTipping': 'Спочатку приєднайтеся до кімнати, щоб кинути монетку.',
        'errors.tipTargetNotInRoom': 'Одержувача монетки немає в цій кімнаті.',
        'errors.cannotTipYourself': 'Не можна кинути монетку самому собі.',
        'errors.memberNotFound': 'Учасника не знайдено.',
        'errors.playerSlotsFull': 'Місця гравців уже зайняті.',
        'errors.invalidJoinRole': 'Некоректна роль для входу.',
        'errors.kickTargetRequired': 'Потрібно вказати, кого вигнати.',
        'errors.readyStateRequired': 'Потрібно вказати стан готовності.',
        'errors.joinRoomFirst': 'Спочатку приєднайтеся до кімнати.',
        'errors.lobbyNotFound': 'Лобі не знайдено.',
        'image.alt.profileAvatar': 'Аватар профілю',
        'image.alt.userAvatar': 'Аватар користувача',
        'image.alt.winnerPicture': 'Фото переможця',
        'image.alt.questionImage': 'Зображення питання',
        'image.alt.audioQuestion': 'Аудіопитання'
    }
} as const

type TranslationKey = keyof (typeof translations)['en']

const fontLabelKeys: Record<AppFont, TranslationKey> = {
    fancy: 'settings.font.option.fancy',
    normal: 'settings.font.option.normal',
    orthodox: 'settings.font.option.orthodox',
    retro: 'settings.font.option.retro',
    silly: 'settings.font.option.silly'
}

const languageLabelKeys: Record<AppLanguage, TranslationKey> = {
    en: 'settings.language.option.en',
    uk: 'settings.language.option.uk'
}

const gameLabelKeys: Record<GameName, TranslationKey> = {
    Clicker: 'game.clicker',
    Jeopardy: 'game.jeopardy',
    TicTacToe: 'game.ticTacToe'
}

const memberRoleKeys: Record<LobbyMemberRole, TranslationKey> = {
    player: 'role.player',
    spectator: 'role.spectator'
}

const fieldLabelKeys: Record<string, TranslationKey> = {
    background: 'lobbyCreator.field.background',
    pack: 'lobbyCreator.field.pack'
}

const knownErrorMessages: Record<string, TranslationKey> = {
    'A Clicker session is already in progress': 'ws.error.fallback.gameSendAction',
    'Cannot start a ready check during an active game': 'errors.readyCheckDuringGame',
    'Cell is already taken': 'errors.cellAlreadyTaken',
    'Clicker requires at least 1 player': 'errors.clickerRequiresPlayer',
    'Failed to destroy lobby': 'errors.failedToDestroyLobby',
    'Failed to update profile': 'errors.failedToUpdateProfile',
    'Incorrect password': 'errors.incorrectPassword',
    'Invalid board cell': 'errors.invalidBoardCell',
    'Invalid join role': 'errors.invalidJoinRole',
    'Invalid role': 'lobby.invalidRole',
    'Kick target is required': 'errors.kickTargetRequired',
    'Lobby ID is not valid': 'errors.lobbyIdInvalid',
    'Lobby create payload must be FormData': 'errors.lobbyCreateFormData',
    'Lobby not found': 'errors.lobbyNotFound',
    'Message cannot be empty': 'errors.messageCannotBeEmpty',
    'Only active players can respond to the ready check': 'errors.onlyActivePlayersReadyCheck',
    'Only players can click': 'errors.onlyPlayersCanClick',
    'Only players can make moves': 'errors.onlyPlayersCanMakeMoves',
    'Only players can start Clicker': 'errors.onlyPlayersCanStartClicker',
    'Only players can start the game': 'errors.onlyPlayersCanStartGame',
    'Profile payload must be FormData': 'errors.profileFormData',
    'Ready state is required': 'errors.readyStateRequired',
    'Registration failed': 'errors.registrationFailed',
    'The live lobby connection is not ready yet. Please try again in a moment.': 'ws.error.socketNotReady',
    'There is no active game': 'errors.noActiveGame',
    'There is no active ready check': 'errors.noActiveReadyCheck',
    'TicTacToe requires exactly 2 players': 'errors.ticTacToeRequiresTwoPlayers',
    'Tip target is not in this room': 'errors.tipTargetNotInRoom',
    'You are not in this room': 'errors.joinRoomFirst',
    'You cannot tip yourself': 'errors.cannotTipYourself',
    'It is not your turn': 'errors.notYourTurn',
    'Join the room before responding': 'errors.joinRoomBeforeResponding',
    'Join the room before sending messages': 'errors.joinRoomBeforeSendingMessages',
    'Join the room before tipping': 'errors.joinRoomBeforeTipping',
    'Member not found': 'errors.memberNotFound',
    'Player slots are full': 'errors.playerSlotsFull',
    'nickname cannot be empty': 'login.nicknameEmpty'
}

type SettingsContextValue = {
    font: AppFont
    language: AppLanguage
    setFont: (value: AppFont) => void
    setLanguage: (value: AppLanguage) => void
    t: (key: TranslationKey, params?: TranslationParams) => string
    tFieldLabel: (fieldName: string, fallback?: string) => string
    tFontName: (value: AppFont) => string
    tGameName: (value: GameName) => string
    tLanguageName: (value: AppLanguage) => string
    tMemberCount: (count: number) => string
    tMemberRole: (value: LobbyMemberRole) => string
    translateErrorMessage: (message?: string | null) => string
}

const SettingsContext = createContext<SettingsContextValue>({
    font: DEFAULT_FONT,
    language: DEFAULT_LANGUAGE,
    setFont: () => {},
    setLanguage: () => {},
    t: key => translations.en[key],
    tFieldLabel: (_fieldName, fallback = '') => fallback,
    tFontName: value => translations.en[fontLabelKeys[value]],
    tGameName: value => translations.en[gameLabelKeys[value]],
    tLanguageName: value => translations.en[languageLabelKeys[value]],
    tMemberCount: count => `${count}`,
    tMemberRole: value => translations.en[memberRoleKeys[value]],
    translateErrorMessage: message => message || ''
})

function interpolate(template: string, params?: TranslationParams) {
    if (!params) {
        return template
    }

    return Object.entries(params).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, String(value)), template)
}

function getStoredLanguage(): AppLanguage {
    if (typeof window === 'undefined') {
        return DEFAULT_LANGUAGE
    }

    const rawValue = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return rawValue === 'uk' || rawValue === 'en' ? rawValue : DEFAULT_LANGUAGE
}

function getStoredFont(): AppFont {
    if (typeof window === 'undefined') {
        return DEFAULT_FONT
    }

    const rawValue = window.localStorage.getItem(FONT_STORAGE_KEY)

    return rawValue === 'normal' || rawValue === 'silly' || rawValue === 'retro' || rawValue === 'fancy' || rawValue === 'orthodox' ? rawValue : DEFAULT_FONT
}

export const SettingsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [language, setLanguageState] = useState<AppLanguage>(DEFAULT_LANGUAGE)
    const [font, setFontState] = useState<AppFont>(DEFAULT_FONT)

    useEffect(() => {
        const storedLanguage = getStoredLanguage()
        const storedFont = getStoredFont()
        const frameId = window.requestAnimationFrame(() => {
            if (storedLanguage !== DEFAULT_LANGUAGE) {
                setLanguageState(storedLanguage)
            }

            if (storedFont !== DEFAULT_FONT) {
                setFontState(storedFont)
            }
        })

        return () => window.cancelAnimationFrame(frameId)
    }, [])

    useEffect(() => {
        document.documentElement.lang = language
        if (document.body) {
            document.body.dataset.appFont = font
        }
        document.title = translations[language]['app.title']
    }, [font, language])

    const t = (key: TranslationKey, params?: TranslationParams) => interpolate(translations[language][key], params)

    const setLanguage = (value: AppLanguage) => {
        setLanguageState(value)
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, value)
    }

    const setFont = (value: AppFont) => {
        setFontState(value)
        window.localStorage.setItem(FONT_STORAGE_KEY, value)
    }

    const tMemberCount = (count: number) => t(count === 1 ? 'members.count.one' : 'members.count.other', { count })

    const translateErrorMessage = (message?: string | null) => {
        if (!message) {
            return ''
        }

        const directKey = knownErrorMessages[message]

        if (directKey) {
            return t(directKey)
        }

        const realtimeMatch = message.match(/^The realtime API does not support (.+) yet$/)

        if (realtimeMatch?.[1]) {
            return t('errors.realtimeApiNotSupported', { gameName: realtimeMatch[1] })
        }

        const cannotLobbyMatch = message.match(/^Cannot (?:find |open )?lobby(?: with id:| with ID:)?\s*(.+)$/i)

        if (cannotLobbyMatch?.[1]) {
            return t('errors.cannotLobby', { id: cannotLobbyMatch[1].trim() })
        }

        return message
    }

    return (
        <SettingsContext.Provider
            value={{
                font,
                language,
                setFont,
                setLanguage,
                t,
                tFieldLabel: (fieldName, fallback = fieldName) => {
                    const key = fieldLabelKeys[fieldName]
                    return key ? t(key) : fallback
                },
                tFontName: value => t(fontLabelKeys[value]),
                tGameName: value => t(gameLabelKeys[value]),
                tLanguageName: value => t(languageLabelKeys[value]),
                tMemberCount,
                tMemberRole: value => t(memberRoleKeys[value]),
                translateErrorMessage
            }}
        >
            {children}
        </SettingsContext.Provider>
    )
}

export const useSettings = () => useContext(SettingsContext)

export const useI18n = () => {
    return useSettings()
}
